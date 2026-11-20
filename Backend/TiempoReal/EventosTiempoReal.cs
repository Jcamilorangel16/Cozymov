namespace Backend.TiempoReal;

/// <summary>
/// Versión de los contratos que el Hub envía al navegador. Cada evento la lleva en
/// <c>version</c>: un cambio incompatible sube este número y el cliente que no lo
/// conoce no interpreta el evento, sino que se resincroniza por HTTP.
/// </summary>
public static class VersionEventos
{
    public const int Actual = 1;
}

/// <summary>
/// Un mensaje recién guardado. Lo reciben solo el emisor y el receptor (todas sus
/// pestañas). Lleva lo mismo que ya ven por HTTP en la conversación y en la lista de
/// chats: el nombre del emisor sirve para el aviso emergente.
/// </summary>
public sealed record MensajeNuevoEvento(
    int Version,
    int IdMensaje,
    int IdEmisor,
    int IdReceptor,
    string NombreEmisor,
    string Contenido,
    DateTime FechaHora);

/// <summary>
/// El lector abrió la conversación con el emisor: todos los mensajes del emisor al
/// lector con id hasta <see cref="HastaIdMensaje"/> quedaron leídos.
/// </summary>
public sealed record MensajesLeidosEvento(
    int Version,
    int IdLector,
    int IdEmisor,
    int HastaIdMensaje);

/// <summary>
/// Cambió una reserva o un viaje que le concierne al destinatario. No trae los datos
/// del viaje: el cliente los vuelve a pedir por HTTP, donde se aplica la autorización
/// de siempre.
/// </summary>
public sealed record ViajeActualizadoEvento(
    int Version,
    string Motivo,
    long IdViaje);

/// <summary>Valores de <see cref="ViajeActualizadoEvento.Motivo"/>.</summary>
public static class MotivoViaje
{
    /// <summary>Un pasajero reservó un viaje publicado.</summary>
    public const string ReservaCreada = "reserva-creada";
    /// <summary>Un conductor aceptó la solicitud de un pasajero.</summary>
    public const string SolicitudAceptada = "solicitud-aceptada";
    /// <summary>El pasajero salió del viaje.</summary>
    public const string ReservaCancelada = "reserva-cancelada";
    /// <summary>El pasajero finalizó su viaje (el viaje y sus cupos no cambian).</summary>
    public const string ReservaFinalizada = "reserva-finalizada";
    /// <summary>El conductor canceló el viaje que atendía.</summary>
    public const string ViajeCancelado = "viaje-cancelado";
    /// <summary>El conductor editó el viaje (hora, precio, cupos…).</summary>
    public const string ViajeModificado = "viaje-modificado";
    /// <summary>El viaje se borró junto con sus reservas.</summary>
    public const string ViajeEliminado = "viaje-eliminado";
}
