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
          <p>El código vence en <strong>10 minutos</strong>.</p>
          <p style="color: #64748b; font-size: 13px;">
            Si no solicitaste este código, ignora este mensaje. Nadie de Cozymov te pedirá el código por teléfono.
          </p>
        </div>
        """;

    private const string PlantillaRecuperacionHtml = """
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #0d6efd; margin-bottom: 8px;">Cozymov</h2>
          <p style="margin-top: 0;">Recibimos una solicitud para restablecer tu contraseña. Usa este código:</p>
          <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; text-align: center;
                    background: #f1f5f9; padding: 16px 0; border-radius: 8px; margin: 24px 0;">
            {0}
          </p>
          <p>El código vence en <strong>10 minutos</strong> y solo puede usarse una vez.</p>
          <p style="color: #64748b; font-size: 13px;">
            Si no lo solicitaste, ignora este mensaje: tu contraseña no cambiará. Nadie de Cozymov te pedirá el código por teléfono.
          </p>
        </div>
        """;

    public Task EnviarCodigoAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default) =>
        EnviarAsync(
            correo,
            codigo,
            "Cozymov: confirma tu correo electronico",
            PlantillaHtml,
            $"Tu código de verificación de Cozymov es {codigo}. Vence en 10 minutos.",
            "verificación",
            cancellationToken);

    public Task EnviarCodigoRecuperacionAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default) =>
        EnviarAsync(
            correo,
            codigo,
            "Cozymov: restablece tu contraseña",
            PlantillaRecuperacionHtml,
            $"Tu código para restablecer la contraseña de Cozymov es {codigo}. Vence en 10 minutos.",
            "recuperación",
            cancellationToken);

    private async Task EnviarAsync(
        string correo,
        string codigo,
        string asunto,
        string plantillaHtml,
        string texto,
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
                subject = asunto,
                htmlContent = string.Format(plantillaHtml, codigo),
                textContent = texto,
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
