namespace Backend.Services;

public sealed class CorreoNoConfiguradoException : Exception
{
    public CorreoNoConfiguradoException()
        : base("El envío de correos no está configurado.")
    {
    }
}
