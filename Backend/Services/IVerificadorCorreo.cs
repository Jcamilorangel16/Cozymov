namespace Backend.Services;

public interface IVerificadorCorreo
{
    ComprobanteCorreo CrearComprobante(string correo, string codigo);

    ResultadoVerificacionCorreo Verificar(
        string correo,
        string comprobante,
        string codigo);
}

public sealed record ComprobanteCorreo(string Valor, DateTimeOffset Vence);

public sealed record ResultadoVerificacionCorreo(bool EsValido, string? Error)
{
    public static ResultadoVerificacionCorreo Valido() => new(true, null);

    public static ResultadoVerificacionCorreo Invalido(string error) => new(false, error);
}
