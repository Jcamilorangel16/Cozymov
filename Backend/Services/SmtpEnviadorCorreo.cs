using MimeKit;

namespace Backend.Services;

/// <summary>
/// Envía los correos con código por SMTP. La configuración viene solo de
/// variables de entorno (ver <see cref="OpcionesSmtp"/>); nunca se escriben
/// credenciales en el código ni se registran en el log.
/// </summary>
public sealed class SmtpEnviadorCorreo(
    ITransporteSmtp transporte,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<SmtpEnviadorCorreo> logger) : IEnviadorCorreo
{
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
        var opciones = OpcionesSmtp.Leer(configuration, environment.IsDevelopment(), out var motivo);
        if (opciones is null)
        {
            if (environment.IsDevelopment())
            {
                // Solo en Development: sin SMTP el código se lee en el log del backend.
                logger.LogWarning(
                    "SMTP no está configurado ({Motivo}). Código de {Tipo} para {Correo}: {Codigo}",
                    motivo,
                    tipo,
                    correo,
                    codigo);
                return;
            }

            logger.LogError("SMTP no está configurado: {Motivo}", motivo);
            throw new CorreoNoConfiguradoException();
        }

        var mensaje = new MimeMessage();
        mensaje.From.Add(new MailboxAddress(opciones.NombreRemitente, opciones.Remitente));
        mensaje.To.Add(MailboxAddress.Parse(correo));
        mensaje.Subject = contenido.Asunto;
        mensaje.Body = new BodyBuilder
        {
            HtmlBody = contenido.Html,
            TextBody = contenido.Texto,
        }.ToMessageBody();

        logger.LogInformation(
            "Enviando código de {Tipo} por SMTP ({Host}:{Puerto}, {Seguridad}).",
            tipo,
            opciones.Host,
            opciones.Puerto,
            opciones.Seguridad);

        // Cualquier fallo (conexión, TLS, autenticación o rechazo del destinatario)
        // se propaga: los controladores lo registran y responden de forma segura
        // sin exponer detalles del servidor ni del destinatario.
        await transporte.EnviarAsync(opciones, mensaje, cancellationToken);
    }
}
