using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Backend.Middleware;
using System.Net;
using System.Threading.RateLimiting;

static string ObtenerClaveIp(HttpContext context)
{
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
builder.Services.AddCors();
builder.Services.AddScoped<IPasswordHasher<Usuarios>,PasswordHasher<Usuarios>>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IVerificadorCorreo, VerificadorCorreoHmac>();
builder.Services.AddHttpClient<IEnviadorCorreo, BrevoEnviadorCorreo>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
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
    options.AddPolicy("codigo-correo", context =>
        RateLimitPartition.GetFixedWindowLimiter(ObtenerClaveIp(context), _ =>
            new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(15),
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

//Permisos para consumir la API desde cualquier origen
app.UseCors(builder =>
    builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());


app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();


app.Run();

public partial class Program { }