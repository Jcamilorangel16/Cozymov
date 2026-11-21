// Historial de secciones del menú: permite volver a la sección anterior con una flecha.

/** Máximo de secciones recordadas; las más antiguas se descartan. */
export const MAX_HISTORIAL_VISTAS = 20;

/**
 * Registra la sección actual como «anterior» antes de pasar a otra.
 * No hace nada si el destino es la misma sección.
 * @param {string[]} historial Secciones previas, de la más antigua a la más reciente.
 * @param {string} actual Sección que se abandona.
 * @param {string} destino Sección a la que se va.
 * @returns {string[]} Nuevo historial (el original no se modifica).
 */
export function apilarVista(historial, actual, destino) {
  if (!actual || actual === destino) return historial;
  return [...historial, actual].slice(-MAX_HISTORIAL_VISTAS);
}

/**
 * Saca la última sección visitada.
 * @param {string[]} historial Secciones previas.
 * @returns {{destino: string|null, historial: string[]}} Sección a la que volver (null si no hay) y el historial restante.
 */
export function desapilarVista(historial) {
  if (historial.length === 0) return { destino: null, historial };
  return { destino: historial[historial.length - 1], historial: historial.slice(0, -1) };
}

/**
 * Historial al regresar al viaje desde la conversación: si la sección anterior es «Buscar», se
 * consume esa entrada; si no (p. ej. se llegó por un aviso), se deja como estaba.
 * @param {string[]} historial Secciones previas.
 * @returns {string[]} Historial resultante.
 */
export function historialAlVolverAlViaje(historial) {
  const { destino, historial: resto } = desapilarVista(historial);
  return destino === "buscar" ? resto : historial;
}
