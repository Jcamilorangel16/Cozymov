namespace Backend.Services;

public sealed class VerificacionCorreoNoConfiguradaException : Exception
{
    public VerificacionCorreoNoConfiguradaException()
        : base("Jwt:Clave no está configurada para firmar la verificación del correo.")
    {
    }
}
