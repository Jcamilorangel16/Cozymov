using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Backend.Middleware;
using Backend.TiempoReal;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http.Connections;
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
// Registro de vehículos: el almacén guarda los archivos en Supabase Storage.
builder.Services.AddHttpClient<IAlmacenArchivos, SupabaseAlmacenArchivos>();
builder.Services.AddScoped<VehiculoRegistroService>();
builder.Services.AddSingleton<LimitadorIntentos>();

// Códigos por correo (confirmar correo del registro y restablecer contraseña).
// Con Resend:ApiKey se envía por la API HTTPS de Resend (sirve donde el host
// bloquea los puertos SMTP, como Render gratis); si no, por la sección Smtp.
// Ambas se completan con User Secrets o variables Resend__* / Smtp__*; sin
// ninguna, los endpoints de /api/codigos-correo responden 503.
builder.Services.AddSingleton<CodigosVerificacion>();
var opcionesResend = builder.Configuration.GetSection("Resend").Get<OpcionesResend>() ?? new OpcionesResend();
if (!string.IsNullOrWhiteSpace(opcionesResend.ApiKey))
{
    builder.Services.AddSingleton(opcionesResend);
    builder.Services.AddHttpClient<IEnviadorCorreo, EnviadorCorreoResend>(cliente =>
        cliente.Timeout = TimeSpan.FromSeconds(20));
}
else
{
    builder.Services.AddSingleton(builder.Configuration.GetSection("Smtp").Get<OpcionesSmtp>() ?? new OpcionesSmtp());
    builder.Services.AddSingleton<IEnviadorCorreo, EnviadorCorreoSmtp>();
}

// Tiempo real (SignalR). El navegador conecta al Hub directamente con un ticket de un
// solo uso que pide el servidor de Next.js tras verificar la sesión. Ver README_TIEMPO_REAL.md.
builder.Services.AddSingleton(
    OpcionesTiempoReal.Desde(builder.Configuration, builder.Environment.IsDevelopment()));
builder.Services.AddSingleton<AlmacenTicketsTiempoReal>();
builder.Services.AddSingleton<RegistroConexionesTiempoReal>();
builder.Services.AddSingleton<INotificadorTiempoReal, NotificadorTiempoReal>();
builder.Services.AddAuthentication()
    .AddScheme<AuthenticationSchemeOptions, TicketTiempoRealHandler>(TicketTiempoReal.Esquema, null);
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = false;
    // El navegador no invoca métodos: solo envía el saludo inicial y pings.
    options.MaximumReceiveMessageSize = 4 * 1024;
    options.MaximumParallelInvocationsPerClient = 1;
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, cancellationToken) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Has realizado demasiados intentos. Inténtalo de nuevo más tarde." },
            cancellationToken);
    };
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
    // Pedir, verificar y usar códigos por correo. Cada correo tiene además su
    // propia espera de reenvío y tope de intentos (CodigosVerificacion).
    options.AddPolicy("codigos", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(15),
                QueueLimit = 0
            }));
});



var app = builder.Build();

if (!app.Environment.IsDevelopment() &&
    app.Services.GetRequiredService<OpcionesTiempoReal>().OrigenesPermitidos.Count == 0)
{
    app.Logger.LogWarning(
        "TiempoReal:OrigenesPermitidos está vacío: ningún navegador podrá conectar al Hub y la aplicación usará solo HTTP.");
}

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

// Solo la aplicación web puede abrir el WebSocket del Hub (los WebSockets no usan CORS).
app.UseMiddleware<OrigenTiempoRealMiddleware>();

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

// La autenticación solo actúa en la ruta del Hub (ticket); el resto de la API se
// sigue autorizando con X-Internal-Api-Key.
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Solo WebSockets: el cliente conecta sin negociación, así que no hace falta abrir CORS
// ni aceptar transportes de respaldo. Si el WebSocket no está disponible, la app sigue
// con sus consultas HTTP. La conexión se cierra cuando vence su autenticación.
app.MapHub<TiempoRealHub>(TiempoRealHub.Ruta, options =>
{
    options.Transports = HttpTransportType.WebSockets;
    options.CloseOnAuthenticationExpiration = true;
});


app.Run();

public partial class Program { }