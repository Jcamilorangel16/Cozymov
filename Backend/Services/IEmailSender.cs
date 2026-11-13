namespace Backend.Services;

/// <summary>
/// Envía los correos transaccionales de la aplicación.
/// </summary>
public interface IEmailSender
{
    /// <summary>
    /// Envía al correo indicado el código de 6 dígitos para confirmar la cuenta.
    /// </summary>
    Task EnviarCodigoVerificacionAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default);
}
