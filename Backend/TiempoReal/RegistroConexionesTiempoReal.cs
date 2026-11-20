namespace Backend.TiempoReal;

/// <summary>
/// Conexiones abiertas por usuario. Acota cuántas puede mantener una misma cuenta
/// (una por pestaña), para que una sesión no agote los recursos del servidor.
/// </summary>
public sealed class RegistroConexionesTiempoReal
{
    public const int MaxConexionesPorUsuario = 10;

    private readonly Dictionary<string, HashSet<string>> _conexiones = new(StringComparer.Ordinal);
    private readonly object _bloqueo = new();

    /// <summary>Registra la conexión; false si el usuario ya tiene el máximo abierto.</summary>
    public bool IntentarRegistrar(string idUsuario, string idConexion)
    {
        lock (_bloqueo)
        {
            if (!_conexiones.TryGetValue(idUsuario, out var abiertas))
            {
                abiertas = new HashSet<string>(StringComparer.Ordinal);
                _conexiones[idUsuario] = abiertas;
            }

            if (abiertas.Count >= MaxConexionesPorUsuario && !abiertas.Contains(idConexion))
            {
                return false;
            }

            abiertas.Add(idConexion);
            return true;
        }
    }

    /// <summary>Libera la conexión. Si no estaba registrada no hace nada.</summary>
    public void Liberar(string idUsuario, string idConexion)
    {
        lock (_bloqueo)
        {
            if (_conexiones.TryGetValue(idUsuario, out var abiertas) &&
                abiertas.Remove(idConexion) &&
                abiertas.Count == 0)
            {
                _conexiones.Remove(idUsuario);
            }
        }
    }

    public int Abiertas(string idUsuario)
    {
        lock (_bloqueo)
        {
            return _conexiones.TryGetValue(idUsuario, out var abiertas) ? abiertas.Count : 0;
        }
    }
}
