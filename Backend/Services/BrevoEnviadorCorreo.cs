namespace Backend.Services;

/// <summary>
/// Envía correo transaccional con la API HTTP de Brevo.
/// </summary>
public sealed class BrevoEnviadorCorreo(
    HttpClient httpClient,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<BrevoEnviadorCorreo> logger) : IEnviadorCorreo
{
    private const string Endpoint = "https://api.brevo.com/v3/smtp/email";

    public Task EnviarCodigoAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default) =>
        EnviarAsync(correo, codigo, PlantillasCorreo.Verificacion(codigo), "verificación", cancellationToken);

    public Task EnviarCodigoRecuperacionAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default) =>
        EnviarAsync(correo, codigo, PlantillasCorreo.Recuperacion(codigo), "recuperación", cancellationToken);

    private async Task EnviarAsync(
        string correo,
        string codigo,
        CorreoConCodigo contenido,
        string tipo,
        CancellationToken cancellationToken)
    {
        var apiKey = configuration["Correo:BrevoApiKey"];
        var remitente = configuration["Correo:Remitente"];
        var nombreRemitente = configuration["Correo:NombreRemitente"] ?? "Cozymov";

        if (string.IsNullOrWhiteSpace(apiKey) ||
            string.IsNullOrWhiteSpace(remitente))
        {
            if (environment.IsDevelopment())
            {
                logger.LogWarning(
                    "Brevo no está configurado. Código de {Tipo} para {Correo}: {Codigo}",
                    tipo,
                    correo,
                    codigo);
                return;
            }

            throw new CorreoNoConfiguradoException();
        }

        using var solicitud = new HttpRequestMessage(HttpMethod.Post, Endpoint)
        {
            Content = JsonContent.Create(new
            {
                sender = new { name = nombreRemitente, email = remitente },
                to = new[] { new { email = correo } },
                subject = contenido.Asunto,
                htmlContent = contenido.Html,
                textContent = contenido.Texto,
            }),
        };
        solicitud.Headers.TryAddWithoutValidation("api-key", apiKey);

        logger.LogInformation("Enviando código de {Tipo} por Brevo.", tipo);
        using var respuesta = await httpClient.SendAsync(solicitud, cancellationToken);
        if (respuesta.StatusCode != System.Net.HttpStatusCode.Created)
        {
            throw new HttpRequestException(
                $"Brevo respondió con el estado HTTP {(int)respuesta.StatusCode}.",
                inner: null,
                respuesta.StatusCode);
        }
    }
}
