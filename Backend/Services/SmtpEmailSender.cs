using System.Net;
using System.Net.Mail;
using System.Text;

namespace Backend.Services;

/// <summary>
/// Implementación SMTP pensada para Gmail (contraseña de aplicación) y
/// cualquier proveedor compatible con SMTP autenticado.
/// </summary>
public sealed class SmtpEmailSender(
    IConfiguration configuration,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
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

    public async Task EnviarCodigoVerificacionAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default)
    {
        var host = configuration["Smtp:Host"] ?? "smtp.gmail.com";
        var puerto = int.TryParse(configuration["Smtp:Port"], out var puertoConfigurado)
            ? puertoConfigurado
            : 587;
        var habilitarSsl = !bool.TryParse(configuration["Smtp:EnableSsl"], out var ssl) || ssl;
        var usuario = configuration["Smtp:User"];
        var contrasena = configuration["Smtp:Password"];
        var remitente = configuration["Smtp:From"] ?? usuario;
        var nombreRemitente = configuration["Smtp:FromName"] ?? "Cozymov";

        if (string.IsNullOrWhiteSpace(usuario) ||
            string.IsNullOrWhiteSpace(contrasena) ||
            string.IsNullOrWhiteSpace(remitente))
        {
            throw new InvalidOperationException(
                "El envío de correos no está configurado. Define Smtp:Host, Smtp:Port, " +
                "Smtp:User, Smtp:Password y Smtp:From.");
        }

        using var mensaje = new MailMessage
        {
            From = new MailAddress(remitente, nombreRemitente, Encoding.UTF8),
            Subject = "Cozymov: confirma tu correo electrónico",
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true,
            Body = string.Format(PlantillaHtml, codigo),
        };
        mensaje.To.Add(new MailAddress(correo));

        using var cliente = new SmtpClient(host, puerto)
        {
            EnableSsl = habilitarSsl,
            UseDefaultCredentials = false,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = new NetworkCredential(usuario, contrasena),
            Timeout = 15_000,
        };

        logger.LogInformation("Enviando código de verificación por SMTP a {Correo}.", correo);
        await cliente.SendMailAsync(mensaje, cancellationToken);
    }
}
