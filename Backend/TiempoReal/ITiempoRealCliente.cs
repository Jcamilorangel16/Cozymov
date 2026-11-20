namespace Backend.TiempoReal;

/// <summary>
/// Eventos que el servidor envía al navegador. El nombre del método es el nombre del
/// evento en el cable (<c>MensajeNuevo</c>, <c>MensajesLeidos</c>, <c>ViajeActualizado</c>).
/// </summary>
public interface ITiempoRealCliente
{
    Task MensajeNuevo(MensajeNuevoEvento evento);

    Task MensajesLeidos(MensajesLeidosEvento evento);

    Task ViajeActualizado(ViajeActualizadoEvento evento);
}
