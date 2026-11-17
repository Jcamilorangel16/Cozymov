using System.Collections.Concurrent;

namespace Backend.Services;

/// <summary>
/// Cuenta los intentos fallidos por clave (por ejemplo, el correo de una
/// cuenta) y la bloquea temporalmente al superar el máximo. Frena la fuerza
/// bruta sobre una cuenta aunque el atacante cambie de dirección IP, cosa que
/// el límite por IP no cubre.
/// El estado vive en memoria: se pierde al reiniciar y no se comparte entre
/// instancias. Es suficiente para un solo proceso; con varias réplicas habría
/// que moverlo a un almacén compartido.
/// </summary>
public sealed class LimitadorIntentos(TimeProvider timeProvider)
{
    public const int MaximoIntentos = 8;
    public static readonly TimeSpan Ventana = TimeSpan.FromMinutes(15);

    private const int UmbralLimpieza = 10_000;

    private readonly ConcurrentDictionary<string, Registro> _registros =
        new(StringComparer.Ordinal);

    /// <summary>Indica si la clave agotó sus intentos en la ventana vigente.</summary>
    public bool EstaBloqueado(string clave)
    {
        return _registros.TryGetValue(clave, out var registro) &&
               registro.Vence > timeProvider.GetUtcNow() &&
               registro.Fallos >= MaximoIntentos;
    }

    /// <summary>Anota un intento fallido; la ventana empieza con el primero.</summary>
    public void RegistrarFallo(string clave)
    {
        var ahora = timeProvider.GetUtcNow();
        _registros.AddOrUpdate(
            clave,
            _ => new Registro(1, ahora.Add(Ventana)),
            (_, actual) => actual.Vence <= ahora
                ? new Registro(1, ahora.Add(Ventana))
                : actual with { Fallos = actual.Fallos + 1 });

        if (_registros.Count > UmbralLimpieza)
        {
            foreach (var par in _registros)
            {
                if (par.Value.Vence <= ahora)
                {
                    _registros.TryRemove(par);
                }
            }
        }
    }

    /// <summary>Olvida los fallos de la clave tras un intento correcto.</summary>
    public void Reiniciar(string clave) => _registros.TryRemove(clave, out _);

    private sealed record Registro(int Fallos, DateTimeOffset Vence);
}
