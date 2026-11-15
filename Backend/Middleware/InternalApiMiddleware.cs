using System.Security.Cryptography;
using System.Text;

namespace Backend.Middleware;

public sealed class InternalApiMiddleware(
    RequestDelegate next,
    IConfiguration configuration,
    ILogger<InternalApiMiddleware> logger)
{
    private static readonly string[] PrefijosProtegidos =
    [
        "/api/Viajes",
        "/api/Usuarios",
        "/api/registro"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (HttpMethods.IsOptions(context.Request.Method) ||
            !PrefijosProtegidos.Any(prefijo =>
                context.Request.Path.StartsWithSegments(
                    prefijo,
                    StringComparison.OrdinalIgnoreCase)))
        {
            await next(context);
            return;
        }

        var expectedKey = configuration["INTERNAL_API_KEY"];
        if (string.IsNullOrWhiteSpace(expectedKey))
        {
            logger.LogError("INTERNAL_API_KEY no está configurada.");
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "La API interna no está configurada."
            });
            return;
        }

        var receivedKey = context.Request.Headers["X-Internal-Api-Key"].ToString();
        var expectedBytes = Encoding.UTF8.GetBytes(expectedKey);
        var receivedBytes = Encoding.UTF8.GetBytes(receivedKey);
        if (receivedBytes.Length != expectedBytes.Length ||
            !CryptographicOperations.FixedTimeEquals(expectedBytes, receivedBytes))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "No autorizado."
            });
            return;
        }

        await next(context);
    }
}
