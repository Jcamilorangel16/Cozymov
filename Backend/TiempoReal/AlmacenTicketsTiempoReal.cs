using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;

namespace Backend.TiempoReal;

/// <summary>Ticket recién emitido: el valor solo se entrega una vez y no se guarda.</summary>
public sealed record TicketEmitido(string Ticket, TimeSpan Vigencia);

/// <summary>
/// Tickets de un solo uso con los que el navegador abre la conexión al Hub.
///
/// La sesión vive en una cookie de Next.js que este backend no puede validar. Por eso
/// el servidor de Next.js, después de verificar la sesión, pide aquí un ticket para ese
/// usuario (ruta protegida por X-Internal-Api-Key) y se lo pasa al navegador. El ticket
/// es aleatorio (256 bits), vale 60 segundos, sirve solo para el Hub y se consume al
/// conectar. Solo se guarda su hash: un volcado de memoria no permite usarlo.
///
/// Vive en memoria, como <c>LimitadorIntentos</c> y los grupos de SignalR: el despliegue
/// actual es de una sola instancia. Con varias, haría falta un almacén compartido y un
/// backplane (ver README_TIEMPO_REAL.md).
/// </summary>
public sealed class AlmacenTicketsTiempoReal(TimeProvider reloj)
{
    public static readonly TimeSpan Vigencia = TimeSpan.FromSeconds(60);

    /// <summary>
    /// Tickets por usuario y minuto. Cada pestaña pide uno al conectar y otro en cada
    /// reconexión (con espera progresiva), así que el uso normal queda muy por debajo.
    /// </summary>
    public const int MaxTicketsPorMinuto = 30;

    /// <summary>Tope de tickets pendientes de usar, para acotar la memoria.</summary>
    public const int MaxTicketsPendientes = 50_000;

    private static readonly TimeSpan VentanaEmision = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan IntervaloLimpieza = TimeSpan.FromMinutes(1);
    private const int LongitudMaximaTicket = 128;

    private readonly ConcurrentDictionary<string, Pendiente> _tickets = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<int, Ventana> _emisiones = new();
    private readonly object _bloqueoLimpieza = new();
    private DateTimeOffset _ultimaLimpieza = DateTimeOffset.MinValue;

    private sealed record Pendiente(int IdUsuario, DateTimeOffset Expira);

    private sealed class Ventana
    {
        public DateTimeOffset Inicio;
        public int Emitidos;
    }

    /// <summary>
    /// Emite un ticket para el usuario, o null si superó el límite de emisión.
    /// </summary>
    public TicketEmitido? Emitir(int idUsuario)
    {
        if (idUsuario <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(idUsuario));
        }

        var ahora = reloj.GetUtcNow();
        LimpiarVencidos(ahora);

        if (!RegistrarEmision(idUsuario, ahora) || _tickets.Count >= MaxTicketsPendientes)
        {
            return null;
        }

        var ticket = Convert.ToHexStringLower(RandomNumberGenerator.GetBytes(32));
        _tickets[Huella(ticket)] = new Pendiente(idUsuario, ahora + Vigencia);
        return new TicketEmitido(ticket, Vigencia);
    }

    /// <summary>
    /// Consume el ticket y devuelve su usuario. Un ticket desconocido, vencido o ya
    /// usado devuelve null; en cualquier caso deja de existir.
    /// </summary>
    public int? Consumir(string? ticket)
    {
        if (string.IsNullOrEmpty(ticket) || ticket.Length > LongitudMaximaTicket)
        {
            return null;
        }

        if (!_tickets.TryRemove(Huella(ticket), out var pendiente))
        {
            return null;
        }

        return pendiente.Expira > reloj.GetUtcNow() ? pendiente.IdUsuario : null;
    }

    private bool RegistrarEmision(int idUsuario, DateTimeOffset ahora)
    {
        var ventana = _emisiones.GetOrAdd(idUsuario, _ => new Ventana { Inicio = ahora });
        lock (ventana)
        {
            if (ahora - ventana.Inicio >= VentanaEmision)
            {
                ventana.Inicio = ahora;
                ventana.Emitidos = 0;
            }

            if (ventana.Emitidos >= MaxTicketsPorMinuto)
            {
                return false;
            }

            ventana.Emitidos++;
            return true;
        }
    }

    private void LimpiarVencidos(DateTimeOffset ahora)
    {
        lock (_bloqueoLimpieza)
        {
            if (ahora - _ultimaLimpieza < IntervaloLimpieza)
            {
                return;
            }
            _ultimaLimpieza = ahora;
        }

        foreach (var (huella, pendiente) in _tickets)
        {
            if (pendiente.Expira <= ahora)
            {
                _tickets.TryRemove(huella, out _);
            }
        }

        foreach (var (idUsuario, ventana) in _emisiones)
        {
            bool vencida;
            lock (ventana)
            {
                vencida = ahora - ventana.Inicio >= VentanaEmision;
            }
            if (vencida)
            {
                _emisiones.TryRemove(idUsuario, out _);
            }
        }
    }

    private static string Huella(string ticket) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(ticket)));
}
