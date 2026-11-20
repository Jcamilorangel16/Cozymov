namespace Backend.TiempoReal;

/// <summary>Configuración de la sección <c>TiempoReal</c>.</summary>
public sealed class OpcionesTiempoReal
{
    /// <summary>
    /// Orígenes de la aplicación web que pueden abrir el WebSocket del Hub
    /// (<c>TiempoReal:OrigenesPermitidos</c>, separados por coma). Vacío en producción
    /// significa que ningún navegador puede conectar y la app sigue con HTTP.
    /// </summary>
    public IReadOnlyCollection<string> OrigenesPermitidos { get; init; } = [];

    /// <summary>
    /// Una conexión se cierra a esta edad (CloseOnAuthenticationExpiration). El cliente se
    /// reconecta con un ticket nuevo, para el que Next.js vuelve a verificar la sesión: una
    /// sesión cerrada en el navegador no mantiene abierta su conexión indefinidamente.
    /// </summary>
    public TimeSpan DuracionMaximaConexion { get; init; } = TimeSpan.FromHours(1);

    /// <summary>Frontend local de <c>npm run dev</c>, permitido solo en Development si no se configura otro.</summary>
    public static readonly string[] OrigenesDesarrollo = ["http://localhost:3000", "http://127.0.0.1:3000"];

    public static OpcionesTiempoReal Desde(IConfiguration configuracion, bool esDesarrollo)
    {
        var origenes = (configuracion["TiempoReal:OrigenesPermitidos"] ?? string.Empty)
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(origen => origen.TrimEnd('/'))
            .ToArray();

        return new OpcionesTiempoReal
        {
            OrigenesPermitidos = origenes.Length == 0 && esDesarrollo ? OrigenesDesarrollo : origenes
        };
    }
}

/// <summary>
/// Los WebSockets no pasan por CORS: el navegador envía <c>Origin</c> pero no bloquea
/// la conexión por sí mismo. Sin un ticket válido nadie puede conectar, y una página
/// ajena no puede obtenerlo (POST con comprobación de origen en Next.js). Esta lista
/// blanca es una segunda barrera: rechaza la conexión de cualquier página que no sea la
/// aplicación. Un cliente sin <c>Origin</c> no es un navegador y sigue necesitando ticket.
/// </summary>
public sealed class OrigenTiempoRealMiddleware(RequestDelegate next, OpcionesTiempoReal opciones, ILogger<OrigenTiempoRealMiddleware> logger)
{
    private readonly HashSet<string> _permitidos = new(opciones.OrigenesPermitidos, StringComparer.OrdinalIgnoreCase);

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path.StartsWithSegments(TiempoRealHub.Ruta, StringComparison.OrdinalIgnoreCase))
        {
            var origen = context.Request.Headers.Origin.ToString();
            if (!string.IsNullOrEmpty(origen) && !_permitidos.Contains(origen.TrimEnd('/')))
            {
                logger.LogWarning("Conexión al Hub rechazada desde un origen no permitido.");
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return;
            }
        }

        await next(context);
    }
}
