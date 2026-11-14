namespace Backend.Services;

public interface IEnviadorCorreo
{
    Task EnviarCodigoAsync(
        string correo,
        string codigo,
        CancellationToken cancellationToken = default);
}
