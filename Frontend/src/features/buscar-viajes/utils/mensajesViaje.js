// Reglas para escribirle al conductor desde un viaje, antes de confirmar la reserva.

/**
 * Nombre público del conductor de un viaje listado.
 * @param {object} viaje Viaje devuelto por /api/viajes.
 * @returns {string} Nombre a mostrar.
 */
export function nombreConductorViaje(viaje) {
  return (
    viaje?.nombre_conductor ||
    [viaje?.primer_nombre, viaje?.primer_apellido].filter(Boolean).join(" ") ||
    "Conductor"
  );
}

/**
 * Contacto (el conductor) con el que se abre la conversación de un viaje.
 * El id sale del viaje que devolvió el servidor, nunca de un campo editable; la autorización real
 * la hace el proxy /api/mensajes con la sesión.
 * @param {object} viaje Viaje devuelto por /api/viajes.
 * @returns {{id: string, nombre: string}|null} Contacto, o null si el viaje no identifica conductor.
 */
export function contactoDeViaje(viaje) {
  if (viaje?.id_usuario == null || viaje.id_usuario === "") return null;
  return { id: String(viaje.id_usuario), nombre: nombreConductorViaje(viaje) };
}

/**
 * Datos que se conservan del viaje para poder regresar a él desde la conversación.
 * @param {object} viaje Viaje consultado.
 * @param {{origen?: string, destino?: string, fecha?: string}} [filtros] Búsqueda aplicada.
 * @returns {{id_viaje: number|string, origen: string, destino: string, id_conductor: string, filtros: {origen: string, destino: string, fecha: string}}}
 */
export function contextoDeViaje(viaje, filtros = {}) {
  return {
    id_viaje: viaje.id_viaje,
    origen: String(viaje.origen ?? ""),
    destino: String(viaje.destino ?? ""),
    id_conductor: String(viaje.id_usuario ?? ""),
    filtros: {
      origen: filtros.origen ?? "",
      destino: filtros.destino ?? "",
      fecha: filtros.fecha ?? "",
    },
  };
}

/**
 * Indica si se muestra «Mensajes» en un viaje: solo para viajes ajenos, con sesión, ya validado
 * el estado del usuario y mientras no tenga una reserva confirmada.
 * @param {{idUsuario: string, viaje: object, validacionCompletada: boolean, tieneViajeEnCurso: boolean}} datos Estado conocido.
 * @returns {boolean} Si el botón debe aparecer.
 */
export function puedeMensajearDesdeViaje({
  idUsuario,
  viaje,
  validacionCompletada,
  tieneViajeEnCurso,
}) {
  if (!idUsuario || !validacionCompletada || tieneViajeEnCurso) return false;
  const contacto = contactoDeViaje(viaje);
  return contacto !== null && contacto.id !== String(idUsuario);
}

/**
 * La conversación abierta pertenece al viaje guardado (mismo conductor).
 * @param {{id_conductor?: string}|null} contexto Viaje guardado.
 * @param {{id: string}|null} contacto Contacto de la conversación.
 * @returns {boolean} Si procede ofrecer «Volver al viaje».
 */
export function conversacionEsDelViaje(contexto, contacto) {
  return Boolean(
    contexto && contacto && contexto.id_conductor && contexto.id_conductor === String(contacto.id),
  );
}
