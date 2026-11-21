using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Backend.Services;

/// <summary>
/// Configuración de la sección <c>Resend</c>. La clave va en User Secrets o en
/// la variable <c>Resend__ApiKey</c>, nunca en appsettings.
/// </summary>
public sealed class OpcionesResend
{
    public string ApiKey { get; set; } = string.Empty;
    /// <summary>Dirección de un dominio verificado en Resend, p. ej. noreply@cozymov.com.</summary>
    public string Remitente { get; set; } = string.Empty;
    public string NombreRemitente { get; set; } = "Cozymov";

    public bool Completa =>
        !string.IsNullOrWhiteSpace(ApiKey) &&
        !string.IsNullOrWhiteSpace(Remitente) &&
        Remitente.Contains('@');
}

/// <summary>
/// Envío por la API HTTPS de Resend (puerto 443). Sirve en hosts que bloquean
/// los puertos SMTP, como el plan gratis de Render.
/// </summary>
public sealed class EnviadorCorreoResend(
    HttpClient http,
    OpcionesResend opciones,
    ILogger<EnviadorCorreoResend> logger) : IEnviadorCorreo
{
    public const string UrlEnvio = "https://api.resend.com/emails";

    public bool Configurado => opciones.Completa;

    public async Task EnviarAsync(
        string destino,
        string asunto,
        string texto,
        string html,
        CancellationToken cancellationToken)
    {
        if (!Configurado)
        {
            throw new InvalidOperationException("La configuración de Resend está incompleta.");
        }

        var nombre = opciones.NombreRemitente.Replace("\"", "").Replace("<", "").Replace(">", "").Trim();
        var remitente = opciones.Remitente.Trim();
        using var solicitud = new HttpRequestMessage(HttpMethod.Post, UrlEnvio)
        {
            Content = JsonContent.Create(new
            {
                from = string.IsNullOrEmpty(nombre) ? remitente : $"{nombre} <{remitente}>",
                to = new[] { destino },
                subject = asunto,
                text = texto,
                html,
            }),
        };
        solicitud.Headers.Authorization = new AuthenticationHeaderValue("Bearer", opciones.ApiKey);

        using var respuesta = await http.SendAsync(solicitud, cancellationToken);
        if (!respuesta.IsSuccessStatusCode)
        {
            // Resend responde { statusCode, name, message }; el mensaje explica la
            // causa (clave inválida, dominio sin verificar…) y no incluye la clave.
            var detalle = await LeerMensajeErrorAsync(respuesta, cancellationToken);
            throw new InvalidOperationException($"Resend respondió {(int)respuesta.StatusCode}: {detalle}");
        }

        logger.LogInformation("Correo de verificación enviado.");
    }

    private static async Task<string> LeerMensajeErrorAsync(HttpResponseMessage respuesta, CancellationToken ct)
    {
        try
        {
            using var json = JsonDocument.Parse(await respuesta.Content.ReadAsStringAsync(ct));
            if (json.RootElement.ValueKind == JsonValueKind.Object &&
                json.RootElement.TryGetProperty("message", out var mensaje) &&
                mensaje.ValueKind == JsonValueKind.String)
            {
                var texto = mensaje.GetString() ?? "";
                return texto.Length > 300 ? texto[..300] : texto;
            }
        }
        catch (JsonException)
        {
        }
        return respuesta.ReasonPhrase ?? "sin detalle";
    }
}
