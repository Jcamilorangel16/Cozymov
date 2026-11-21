using MailKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Backend.Services;

/// <summary>Envía correos transaccionales (códigos de verificación).</summary>
public interface IEnviadorCorreo
{
    /// <summary>Falso si falta la configuración SMTP; entonces no se envía nada.</summary>
    bool Configurado { get; }

    Task EnviarAsync(string destino, string asunto, string texto, string html, CancellationToken cancellationToken);
}

/// <summary>
/// Configuración de la sección <c>Smtp</c>. La contraseña va en User Secrets o
/// en variables de entorno (<c>Smtp__Contrasena</c>), nunca en appsettings.
/// </summary>
public sealed class OpcionesSmtp
{
    /// <summary>Por defecto, el SMTP de Microsoft 365 (Outlook institucional).</summary>
    public string Servidor { get; set; } = "smtp.office365.com";
    /// <summary>587 usa STARTTLS; 465, TLS directo.</summary>
    public int Puerto { get; set; } = 587;
    public string Usuario { get; set; } = string.Empty;
    public string Contrasena { get; set; } = string.Empty;
    /// <summary>Dirección del remitente; si falta, se usa el usuario.</summary>
    public string Remitente { get; set; } = string.Empty;
    public string NombreRemitente { get; set; } = "Cozymov";

    public bool Completa =>
        !string.IsNullOrWhiteSpace(Servidor) &&
        !string.IsNullOrWhiteSpace(Usuario) &&
        !string.IsNullOrEmpty(Contrasena) &&
        Puerto is > 0 and <= 65535;
}

/// <summary>Envío por SMTP con autenticación y TLS obligatorio.</summary>
public sealed class EnviadorCorreoSmtp(OpcionesSmtp opciones, ILogger<EnviadorCorreoSmtp> logger) : IEnviadorCorreo
{
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
            throw new InvalidOperationException("La configuración SMTP está incompleta.");
        }

        var remitente = string.IsNullOrWhiteSpace(opciones.Remitente) ? opciones.Usuario : opciones.Remitente;
        var mensaje = new MimeMessage();
        mensaje.From.Add(new MailboxAddress(opciones.NombreRemitente, remitente));
        mensaje.To.Add(MailboxAddress.Parse(destino));
        mensaje.Subject = asunto;
        mensaje.Body = new BodyBuilder { TextBody = texto, HtmlBody = html }.ToMessageBody();

        using var cliente = new SmtpClient { Timeout = 20_000 };
        var seguridad = opciones.Puerto == 465
            ? SecureSocketOptions.SslOnConnect
            : SecureSocketOptions.StartTls;
        await cliente.ConnectAsync(opciones.Servidor, opciones.Puerto, seguridad, cancellationToken);
        await cliente.AuthenticateAsync(opciones.Usuario, opciones.Contrasena, cancellationToken);
        await cliente.SendAsync(new SendRequest(mensaje), cancellationToken);
        await cliente.DisconnectAsync(true, cancellationToken);
        logger.LogInformation("Correo de verificación enviado.");
    }
}
