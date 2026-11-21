using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace Backend.Services;

/// <summary>Para qué se pidió un código; cada propósito tiene su propio código.</summary>
public enum PropositoCodigo
{
    Registro,
    Recuperacion,
}

public enum ResultadoCodigo
{
    Correcto,
    /// <summary>El código no coincide; quedan intentos.</summary>
    Incorrecto,
    /// <summary>No hay código vigente: nunca se pidió, venció, ya se usó o se agotaron los intentos.</summary>
    SinCodigo,
}

/// <summary>
/// Códigos de 6 dígitos enviados por correo para confirmar el correo del
/// registro o restablecer la contraseña. Vencen a los 10 minutos, admiten 5
/// intentos y solo sirven una vez. Se guarda un HMAC del código, nunca el
/// código.
/// El estado vive en memoria (como LimitadorIntentos y los tickets de tiempo
/// real): se pierde al reiniciar y no se comparte entre instancias.
/// </summary>
public sealed class CodigosVerificacion(TimeProvider timeProvider)
{
    public static readonly TimeSpan Vigencia = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan EsperaReenvio = TimeSpan.FromSeconds(60);
    public const int MaximoIntentos = 5;
    /// <summary>Envíos permitidos por correo y propósito en una hora.</summary>
    public const int MaximoEnviosPorHora = 5;

    private const int UmbralLimpieza = 10_000;

    // Clave aleatoria por proceso: los códigos tampoco sobreviven a un reinicio.
    private readonly byte[] _clave = RandomNumberGenerator.GetBytes(32);

    private readonly ConcurrentDictionary<string, Entrada> _entradas = new(StringComparer.Ordinal);

    /// <summary>
    /// Genera un código nuevo para el correo y reemplaza el anterior.
    /// </summary>
    /// <param name="esperar">Si no se puede enviar todavía, cuánto falta.</param>
    /// <returns>El código, o null si hay que esperar.</returns>
    public string? Generar(PropositoCodigo proposito, string correo, out TimeSpan esperar)
    {
        var ahora = timeProvider.GetUtcNow();
        var clave = Clave(proposito, correo);
        esperar = TimeSpan.Zero;

        if (_entradas.TryGetValue(clave, out var actual))
        {
            var desdeUltimo = ahora - actual.UltimoEnvio;
            if (desdeUltimo < EsperaReenvio)
            {
                esperar = EsperaReenvio - desdeUltimo;
                return null;
            }
            if (actual.InicioVentanaEnvios > ahora - TimeSpan.FromHours(1) &&
                actual.EnviosEnVentana >= MaximoEnviosPorHora)
            {
                esperar = actual.InicioVentanaEnvios.AddHours(1) - ahora;
                return null;
            }
        }

        var codigo = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var nuevaVentana = actual == null || actual.InicioVentanaEnvios <= ahora - TimeSpan.FromHours(1);
        _entradas[clave] = new Entrada(
            Hash(clave, codigo),
            ahora.Add(Vigencia),
            Intentos: 0,
            UltimoEnvio: ahora,
            InicioVentanaEnvios: nuevaVentana ? ahora : actual!.InicioVentanaEnvios,
            EnviosEnVentana: nuevaVentana ? 1 : actual!.EnviosEnVentana + 1,
            Usado: false);

        LimpiarSiHaceFalta(ahora);
        return codigo;
    }

    /// <summary>
    /// Descarta el código recién generado (por ejemplo, si el correo no se pudo
    /// enviar) sin consumir la espera de reenvío.
    /// </summary>
    public void Descartar(PropositoCodigo proposito, string correo) =>
        _entradas.TryRemove(Clave(proposito, correo), out _);

    /// <summary>Comprueba el código y, si es correcto, lo invalida.</summary>
    public ResultadoCodigo Verificar(PropositoCodigo proposito, string correo, string? codigo)
    {
        var ahora = timeProvider.GetUtcNow();
        var clave = Clave(proposito, correo);
        if (!_entradas.TryGetValue(clave, out var entrada) ||
            entrada.Usado ||
            entrada.Vence <= ahora ||
            entrada.Intentos >= MaximoIntentos)
        {
            return ResultadoCodigo.SinCodigo;
        }

        var limpio = (codigo ?? string.Empty).Trim();
        var correcto = limpio.Length == 6 &&
            CryptographicOperations.FixedTimeEquals(entrada.Hash, Hash(clave, limpio));

        // Se conserva la entrada (marcada como usada o con un intento más) para
        // que la espera de reenvío siga contando.
        var actualizada = correcto
            ? entrada with { Usado = true }
            : entrada with { Intentos = entrada.Intentos + 1 };
        if (!_entradas.TryUpdate(clave, actualizada, entrada))
        {
            // Otra solicitud cambió la entrada a la vez: se trata como fallo.
            return ResultadoCodigo.SinCodigo;
        }

        if (correcto) return ResultadoCodigo.Correcto;
        return actualizada.Intentos >= MaximoIntentos
            ? ResultadoCodigo.SinCodigo
            : ResultadoCodigo.Incorrecto;
    }

    private static string Clave(PropositoCodigo proposito, string correo) =>
        $"{proposito}|{correo}";

    private byte[] Hash(string clave, string codigo) =>
        HMACSHA256.HashData(_clave, Encoding.UTF8.GetBytes($"{clave}|{codigo}"));

    private void LimpiarSiHaceFalta(DateTimeOffset ahora)
    {
        if (_entradas.Count <= UmbralLimpieza) return;
        foreach (var par in _entradas)
        {
            if (par.Value.Vence <= ahora && par.Value.InicioVentanaEnvios <= ahora - TimeSpan.FromHours(1))
            {
                _entradas.TryRemove(par);
            }
        }
    }

    private sealed record Entrada(
        byte[] Hash,
        DateTimeOffset Vence,
        int Intentos,
        DateTimeOffset UltimoEnvio,
        DateTimeOffset InicioVentanaEnvios,
        int EnviosEnVentana,
        bool Usado);
}
