using MailKit.Security;
using MimeKit;

namespace Backend.Services;

/// <summary>Modo de cifrado de la conexión SMTP.</summary>
public enum SeguridadSmtp
{
    /// <summary>Conexión sin cifrar. Solo se admite en Development.</summary>
    Ninguna,

    /// <summary>Conexión en claro que se eleva a TLS con STARTTLS (puerto 587).</summary>
    StartTls,

    /// <summary>TLS implícito desde el primer byte (puerto 465).</summary>
    Ssl,
}

/// <summary>
/// Configuración SMTP leída de variables de entorno / User Secrets.
/// Variables: Correo__Smtp__Host, Correo__Smtp__Puerto, Correo__Smtp__Usuario,
/// Correo__Smtp__Password, Correo__Smtp__Seguridad, Correo__Remitente y
/// Correo__NombreRemitente.
/// </summary>
public sealed record OpcionesSmtp(
    string Host,
    int Puerto,
    string? Usuario,
    string? Password,
    SeguridadSmtp Seguridad,
    string Remitente,
    string NombreRemitente)
{
    /// <summary>Opción de MailKit equivalente al modo de seguridad.</summary>
    public SecureSocketOptions OpcionesSocket => Seguridad switch
    {
        SeguridadSmtp.Ssl => SecureSocketOptions.SslOnConnect,
        SeguridadSmtp.StartTls => SecureSocketOptions.StartTls,
        _ => SecureSocketOptions.None,
    };

    /// <summary>
    /// Lee y valida la configuración. Devuelve null cuando falta algún dato
    /// obligatorio o es inválido, con el motivo (sin incluir valores secretos).
    /// </summary>
    public static OpcionesSmtp? Leer(IConfiguration configuracion, bool esDevelopment, out string? motivo)
    {
        motivo = null;
        var host = Valor(configuracion, "Correo:Smtp:Host", "Smtp:Host")?.Trim();
        var remitente = Valor(configuracion, "Correo:Remitente", "Smtp:From")?.Trim();
        var usuario = Valor(configuracion, "Correo:Smtp:Usuario", "Smtp:User");
        var password = Valor(configuracion, "Correo:Smtp:Password", "Smtp:Password");
        var textoPuerto = Valor(configuracion, "Correo:Smtp:Puerto", "Smtp:Port");

        if (string.IsNullOrWhiteSpace(host))
        {
            motivo = "Falta Correo:Smtp:Host.";
            return null;
        }

        if (!RemitenteValido(remitente))
        {
            motivo = "Correo:Remitente falta o no es una dirección válida.";
            return null;
        }

        // Sin modo explícito: 465 implica TLS implícito; cualquier otro puerto, STARTTLS.
        var seguridad = textoPuerto?.Trim() == "465" ? SeguridadSmtp.Ssl : SeguridadSmtp.StartTls;
        var textoSeguridad = configuracion["Correo:Smtp:Seguridad"];
        if (!string.IsNullOrWhiteSpace(textoSeguridad) &&
            !Enum.TryParse(textoSeguridad.Trim(), ignoreCase: true, out seguridad))
        {
            motivo = "Correo:Smtp:Seguridad debe ser Ninguna, StartTls o Ssl.";
            return null;
        }

        if (seguridad == SeguridadSmtp.Ninguna && !esDevelopment)
        {
            motivo = "Correo:Smtp:Seguridad=Ninguna solo se permite en Development.";
            return null;
        }

        var puerto = seguridad switch
        {
            SeguridadSmtp.Ssl => 465,
            SeguridadSmtp.StartTls => 587,
            _ => 25,
        };
        if (!string.IsNullOrWhiteSpace(textoPuerto) &&
            (!int.TryParse(textoPuerto, out puerto) || puerto is < 1 or > 65535))
        {
            motivo = "Correo:Smtp:Puerto debe ser un número entre 1 y 65535.";
            return null;
        }

        // Si hay usuario debe haber contraseña (y al revés): evita un login a medias.
        if (string.IsNullOrEmpty(usuario) != string.IsNullOrEmpty(password))
        {
            motivo = "Correo:Smtp:Usuario y Correo:Smtp:Password deben configurarse juntos.";
            return null;
        }

        return new OpcionesSmtp(
            host,
            puerto,
            string.IsNullOrEmpty(usuario) ? null : usuario,
            string.IsNullOrEmpty(password) ? null : password,
            seguridad,
            remitente!,
            Valor(configuracion, "Correo:NombreRemitente", "Smtp:FromName") ?? "Cozymov");
    }

    /// <summary>
    /// Devuelve la primera clave con valor: primero los nombres documentados
    /// (<c>Correo:*</c>) y después los alternativos (<c>Smtp:*</c>) que ya usaban
    /// algunos entornos.
    /// </summary>
    private static string? Valor(IConfiguration configuracion, string principal, string alternativa)
    {
        var valor = configuracion[principal];
        return string.IsNullOrWhiteSpace(valor) ? configuracion[alternativa] : valor;
    }

    /// <summary>
    /// Un remitente válido es una dirección bien formada y de dominio sin puntos
    /// consecutivos (p. ej. rechaza «unicesar..edu.co»); no se corrige sola.
    /// </summary>
    public static bool RemitenteValido(string? remitente)
    {
        if (string.IsNullOrWhiteSpace(remitente) || remitente.Contains(".."))
        {
            return false;
        }

        return MailboxAddress.TryParse(remitente, out var direccion) &&
               direccion.Address.Contains('@') &&
               direccion.Address.Length <= 254;
    }
}
