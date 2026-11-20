using System.Globalization;
using Microsoft.AspNetCore.SignalR;

namespace Backend.TiempoReal;

/// <summary>
/// Publica eventos de tiempo real. Los controladores lo llaman solo después de que
/// SaveChanges (y el Commit, si hay transacción) terminó bien: PostgreSQL sigue siendo
/// la fuente de verdad y un evento nunca anuncia algo que no quedó guardado.
///
/// Publicar no bloquea ni puede hacer fallar la operación HTTP: el envío se inicia y se
/// observa aparte. Si se pierde (el destinatario estaba desconectado o falló el envío),
/// el cliente se pone al día con las APIs HTTP al reconectar.
/// </summary>
public interface INotificadorTiempoReal
{
    /// <summary>Al emisor y al receptor del mensaje.</summary>
    void PublicarMensajeNuevo(MensajeNuevoEvento evento);

    /// <summary>Al lector y al emisor de los mensajes leídos.</summary>
    void PublicarMensajesLeidos(MensajesLeidosEvento evento);

    /// <summary>A los usuarios indicados (conductor y pasajeros afectados).</summary>
    void PublicarViajeActualizado(ViajeActualizadoEvento evento, IEnumerable<int> destinatarios);
}

public sealed class NotificadorTiempoReal(
    IHubContext<TiempoRealHub, ITiempoRealCliente> hub,
    ILogger<NotificadorTiempoReal> logger) : INotificadorTiempoReal
{
    public void PublicarMensajeNuevo(MensajeNuevoEvento evento) =>
        Enviar(nameof(ITiempoRealCliente.MensajeNuevo), [evento.IdEmisor, evento.IdReceptor],
            clientes => clientes.MensajeNuevo(evento));

    public void PublicarMensajesLeidos(MensajesLeidosEvento evento) =>
        Enviar(nameof(ITiempoRealCliente.MensajesLeidos), [evento.IdLector, evento.IdEmisor],
            clientes => clientes.MensajesLeidos(evento));

    public void PublicarViajeActualizado(ViajeActualizadoEvento evento, IEnumerable<int> destinatarios) =>
        Enviar(nameof(ITiempoRealCliente.ViajeActualizado), destinatarios,
            clientes => clientes.ViajeActualizado(evento));

    private void Enviar(string evento, IEnumerable<int> idsUsuarios, Func<ITiempoRealCliente, Task> enviar)
    {
        var usuarios = idsUsuarios
            .Where(id => id > 0)
            .Distinct()
            .Select(id => id.ToString(CultureInfo.InvariantCulture))
            .ToList();
        if (usuarios.Count == 0)
        {
            return;
        }

        Task envio;
        try
        {
            envio = enviar(hub.Clients.Users(usuarios));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo publicar el evento {Evento}.", evento);
            return;
        }

        if (!envio.IsCompletedSuccessfully)
        {
            _ = ObservarAsync(envio, evento);
        }
    }

    private async Task ObservarAsync(Task envio, string evento)
    {
        try
        {
            await envio;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo publicar el evento {Evento}.", evento);
        }
    }
}

/// <summary>No publica nada. Para pruebas que construyen controladores sin DI.</summary>
public sealed class NotificadorTiempoRealNulo : INotificadorTiempoReal
{
    public static readonly NotificadorTiempoRealNulo Instancia = new();

    public void PublicarMensajeNuevo(MensajeNuevoEvento evento) { }

    public void PublicarMensajesLeidos(MensajesLeidosEvento evento) { }

    public void PublicarViajeActualizado(ViajeActualizadoEvento evento, IEnumerable<int> destinatarios) { }
}
