// Aplica los eventos de tiempo real a la conversación abierta. Lógica pura.
// Los mensajes tienen la forma de /api/mensajes: id_mensaje, id_emisor, id_receptor,
// contenido, fecha_hora, leido.

/**
 * Indica si el evento es de la conversación entre `yo` y `otro`.
 * @param {{idEmisor: number, idReceptor: number}} evento MensajeNuevo.
 * @param {string|number} yo Usuario de la sesión.
 * @param {string|number} otro Contacto de la conversación abierta.
 * @returns {boolean}
 */
export function perteneceAConversacion(evento, yo, otro) {
  const emisor = String(evento?.idEmisor);
  const receptor = String(evento?.idReceptor);
  return (
    (emisor === String(yo) && receptor === String(otro)) ||
    (emisor === String(otro) && receptor === String(yo))
  );
}

/**
 * Convierte un MensajeNuevo en un mensaje de la conversación.
 * @param {{idMensaje: number, idEmisor: number, idReceptor: number, contenido: string, fechaHora: string}} evento
 * @returns {object} Mensaje en el formato de /api/mensajes.
 */
export function mensajeDesdeEvento(evento) {
  return {
    id_mensaje: evento.idMensaje,
    id_emisor: evento.idEmisor,
    id_receptor: evento.idReceptor,
    contenido: evento.contenido,
    fecha_hora: evento.fechaHora,
    leido: false,
  };
}

function compararMensajes(a, b) {
  const fechaA = Date.parse(a.fecha_hora) || 0;
  const fechaB = Date.parse(b.fecha_hora) || 0;
  return fechaA - fechaB || Number(a.id_mensaje) - Number(b.id_mensaje);
}

/**
 * Añade un mensaje sin duplicarlo (puede llegar por evento y por HTTP) y mantiene el orden.
 * @param {Array<object>} lista Mensajes actuales.
 * @param {object} mensaje Mensaje nuevo.
 * @returns {Array<object>} Lista nueva.
 */
export function fusionarMensaje(lista, mensaje) {
  if (lista.some((actual) => actual.id_mensaje === mensaje.id_mensaje)) return lista;
  return [...lista, mensaje].sort(compararMensajes);
}

/**
 * Toma la respuesta HTTP como verdad, pero conserva los mensajes que llegaron por evento
 * después de que se pidió (una respuesta lenta no debe borrar un mensaje recién recibido).
 * @param {Array<object>} actuales Lista en pantalla.
 * @param {Array<object>} servidor Lista devuelta por /api/mensajes.
 * @returns {Array<object>} Lista reconciliada.
 */
export function reconciliarMensajes(actuales, servidor) {
  const ultimoDelServidor = servidor.reduce(
    (maximo, mensaje) => Math.max(maximo, Number(mensaje.id_mensaje) || 0),
    0,
  );
  const posteriores = actuales.filter((mensaje) => Number(mensaje.id_mensaje) > ultimoDelServidor);
  return posteriores.length === 0 ? servidor : [...servidor, ...posteriores].sort(compararMensajes);
}

/**
 * Marca como leídos los mensajes de `idEmisor` con id hasta `hastaIdMensaje` (evento MensajesLeidos).
 * @param {Array<object>} lista Mensajes de la conversación.
 * @param {string|number} idEmisor Quien los envió (el usuario de la sesión).
 * @param {number} hastaIdMensaje Último id leído.
 * @returns {Array<object>} Lista nueva (la misma si no cambia nada).
 */
export function marcarLeidosHasta(lista, idEmisor, hastaIdMensaje) {
  let cambio = false;
  const nueva = lista.map((mensaje) => {
    if (
      !mensaje.leido &&
      String(mensaje.id_emisor) === String(idEmisor) &&
      Number(mensaje.id_mensaje) <= hastaIdMensaje
    ) {
      cambio = true;
      return { ...mensaje, leido: true };
    }
    return mensaje;
  });
  return cambio ? nueva : lista;
}
