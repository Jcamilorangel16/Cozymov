using System.Net;

namespace Backend.Services;

/// <summary>Contenido de un correo con código: asunto, HTML y texto plano.</summary>
public readonly record struct CorreoConCodigo(string Asunto, string Html, string Texto);

/// <summary>
/// Plantillas de los correos con código de seis dígitos. Las comparten los dos
/// mecanismos de envío (SMTP y Brevo) para que el mensaje sea idéntico.
/// </summary>
public static class PlantillasCorreo
{
    /// <summary>Vigencia que se comunica al usuario (coincide con la del código).</summary>
    public const int VigenciaMinutos = 10;

    private const string PlantillaVerificacionHtml = """
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1f2937;">
          <h2 style="color: #0d6efd; margin-bottom: 8px;">Cozymov</h2>
          <p style="margin-top: 0;">Estás a un paso de crear tu cuenta. Usa este código para confirmar tu correo:</p>
          <p style="font-size: 34px; font-weight: 700; letter-spacing: 10px; text-align: center;
                    background: #f1f5f9; padding: 16px 0; border-radius: 8px; margin: 24px 0;">
            {0}
          </p>
          <p>El código vence en <strong>10 minutos</strong>.</p>
          <p>Escríbelo en la pantalla de registro de Cozymov para continuar.</p>
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

    public static CorreoConCodigo Verificacion(string codigo) => new(
        "Cozymov: confirma tu correo electronico",
        PlantillaVerificacionHtml.Replace("{0}", WebUtility.HtmlEncode(codigo)),
        $"Tu código de verificación de Cozymov es {codigo}. Vence en {VigenciaMinutos} minutos. " +
        "Escríbelo en la pantalla de registro para continuar. " +
        "Si no lo solicitaste, ignora este mensaje.");

    public static CorreoConCodigo Recuperacion(string codigo) => new(
        "Cozymov: restablece tu contraseña",
        PlantillaRecuperacionHtml.Replace("{0}", WebUtility.HtmlEncode(codigo)),
        $"Tu código para restablecer la contraseña de Cozymov es {codigo}. " +
        $"Vence en {VigenciaMinutos} minutos. Si no lo solicitaste, ignora este mensaje.");
}
