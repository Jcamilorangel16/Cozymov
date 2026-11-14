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

    private const string PlantillaHtml = """
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #0d6efd; margin-bottom: 8px;">Cozymov</h2>
          <p style="margin-top: 0;">Estás a un paso de crear tu cuenta. Usa este código para confirmar tu correo:</p>
          <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; text-align: center;
                    background: #f1f5f9; padding: 16px 0; border-radius: 8px; margin: 24px 0;">
            {0}
          </p>
          <p>El código vence en <strong>10 minutos</strong> y solo se puede usar una vez.</p>
          <p style="color: #64748b; font-size: 13px;">
            Si no solicitaste este código, ignora este mensaje. Nadie de Cozymov te pedirá el código por teléfono.
          </p>
        </div>
        """;

    public async Task EnviarCodigoAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default)
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
                    "Brevo no está configurado. Código de verificación para {Correo}: {Codigo}",
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
                subject = "Cozymov: confirma tu correo electrónico",
                htmlContent = string.Format(PlantillaHtml, codigo),
                textContent = $"Tu código de verificación de Cozymov es {codigo}. Vence en 10 minutos.",
            }),
        };
        solicitud.Headers.TryAddWithoutValidation("api-key", apiKey);

        logger.LogInformation("Enviando código de verificación por Brevo a {Correo}.", correo);
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
