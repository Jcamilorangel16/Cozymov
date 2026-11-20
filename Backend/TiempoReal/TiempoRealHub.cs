using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.TiempoReal;

/// <summary>
/// Hub de solo envío. No expone métodos al navegador: no hay forma de unirse a un grupo
/// ni de pedir eventos de otro usuario cambiando un id. El servidor decide a quién va
/// cada evento a partir de los datos guardados (emisor/receptor de un mensaje, conductor
/// y pasajeros de un viaje) y lo envía al usuario autenticado por el ticket.
/// </summary>
[Authorize(AuthenticationSchemes = TicketTiempoReal.Esquema)]
public sealed class TiempoRealHub(
    RegistroConexionesTiempoReal registro,
    ILogger<TiempoRealHub> logger) : Hub<ITiempoRealCliente>
{
    /// <summary>Fuera de /api: el navegador conecta directamente, sin X-Internal-Api-Key.</summary>
    public const string Ruta = "/hubs/tiempo-real";

    public override async Task OnConnectedAsync()
    {
        var idUsuario = Context.UserIdentifier;
        if (string.IsNullOrEmpty(idUsuario))
        {
            // No debería ocurrir: [Authorize] exige el ticket.
            throw new HubException("Conexión no autenticada.");
        }

        if (!registro.IntentarRegistrar(idUsuario, Context.ConnectionId))
        {
            logger.LogWarning(
                "Conexión rechazada: el usuario {IdUsuario} ya tiene {Maximo} conexiones abiertas.",
                idUsuario,
                RegistroConexionesTiempoReal.MaxConexionesPorUsuario);
            throw new HubException("Tienes demasiadas pestañas conectadas.");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (!string.IsNullOrEmpty(Context.UserIdentifier))
        {
            registro.Liberar(Context.UserIdentifier, Context.ConnectionId);
        }

        await base.OnDisconnectedAsync(exception);
    }
}
