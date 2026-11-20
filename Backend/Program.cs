using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Backend.Middleware;
using System.Net;
using System.Threading.RateLimiting;

// Clave de partición para los límites por IP.
// Los endpoints limitados exigen X-Internal-Api-Key, así que solo el servidor
// de Next.js llega hasta aquí y es él quien informa la IP del navegador en
// X-Cliente-Ip. X-Forwarded-For se conserva como respaldo: los balanceadores
// que hay entre Next.js y esta API le añaden su propia IP, por lo que su
// último valor puede ser el del frontend y no el del usuario.
static string ObtenerClaveIp(HttpContext context)
{
    var ipCliente = context.Request.Headers["X-Cliente-Ip"].ToString().Trim();
    if (IPAddress.TryParse(ipCliente, out var informada))
    {
        return informada.MapToIPv6().ToString();
    }

    var forwardedIp = context.Request.Headers["X-Forwarded-For"]
        .ToString()
        .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
        .LastOrDefault();
    var ip = IPAddress.TryParse(forwardedIp, out var address)
        ? address.MapToIPv6().ToString()
        : context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "desconocida";

    return ip;
}

var builder = WebApplication.CreateBuilder(args);

// No se anuncia el servidor y se acota el cuerpo: la API solo recibe JSON
// pequeño (el campo más largo es un texto de 500 caracteres).
builder.WebHost.ConfigureKestrel(options =>
{
    options.AddServerHeader = false;
    options.Limits.MaxRequestBodySize = 1024 * 1024;
});

var connectionString = builder.Configuration.GetConnectionString("Supabase")
    ?? throw new InvalidOperationException(
        "No se encontró ConnectionStrings:Supabase. Configure la conexión en User Secrets.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddOpenApi();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
// El navegador nunca llama a esta API: lo hace el servidor de Next.js, al que
// CORS no aplica. Por eso no se permite ningún origen salvo los que se declaren
// en Cors:OrigenesPermitidos (separados por coma).
var origenesPermitidos = (builder.Configuration["Cors:OrigenesPermitidos"] ?? string.Empty)
    .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(politica =>
    {
        if (origenesPermitidos.Length > 0)
        {
            politica.WithOrigins(origenesPermitidos).AllowAnyMethod().AllowAnyHeader();
        }
    }));
builder.Services.AddScoped<IPasswordHasher<Usuarios>,PasswordHasher<Usuarios>>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IVerificadorCorreo, VerificadorCorreoHmac>();
builder.Services.AddSingleton<LimitadorIntentos>();
builder.Services.AddHttpClient<IEnviadorCorreo, BrevoEnviadorCorreo>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<IAlmacenArchivos, SupabaseAlmacenArchivos>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<VehiculoRegistroService>();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Has realizado demasiados intentos. Inténtalo de nuevo más tarde." },
            cancellationToken);
    };
    options.AddPolicy("codigo-correo", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));
    options.AddPolicy("verificar-codigo", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));
    // Frena el rociado de contraseñas desde una misma IP. El cupo es amplio
    // porque una red universitaria comparte IP entre muchos usuarios; la fuerza
    // bruta sobre una cuenta concreta la corta LimitadorIntentos.
    options.AddPolicy("login", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 60,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0
            }));
    options.AddPolicy("registro", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromHours(1),
                QueueLimit = 0
            }));
});



var app = builder.Build();

// En desarrollo, garantiza que la base configurada contiene también las tablas
// añadidas por las migraciones. En producción deben aplicarse en el despliegue.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Configure the HTTP request pipeline.
// Cabeceras defensivas en todas las respuestas, incluidos los rechazos.
app.Use(async (context, next) =>
{
    var cabeceras = context.Response.Headers;
    cabeceras["X-Content-Type-Options"] = "nosniff";
    cabeceras["X-Frame-Options"] = "DENY";
    cabeceras["Referrer-Policy"] = "no-referrer";
    if (context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
    {
        // Las respuestas llevan datos personales: ningún intermediario debe guardarlas.
        cabeceras["Cache-Control"] = "no-store";
    }

    await next(context);
});

app.UseRouting();
app.UseMiddleware<InternalApiMiddleware>();
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "Cozymov API v1");
    });
}

// Solo los orígenes de Cors:OrigenesPermitidos (ninguno por defecto).
app.UseCors();


app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();


app.Run();

public partial class Program { }