// Lógica pura de las solicitudes de pasajeros en «Buscar» y de sus avisos a conductores.
import { normalizarTexto } from "./viajes.js";

/**
 * Filtra las solicitudes pendientes con los mismos criterios del buscador de viajes.
 * Origen y destino coinciden si contienen el texto (sin acentos ni mayúsculas).
 * @param {Array<{origen?: string, destino?: string, fechaHora?: string}>} solicitudes Solicitudes pendientes.
 * @param {{origen?: string, destino?: string, fecha?: string}} filtros Criterios aplicados.
 * @returns {Array} Solicitudes que cumplen todos los criterios indicados.
 */
export function filtrarSolicitudes(solicitudes, filtros = {}) {
  const origen = normalizarTexto(filtros.origen);
  const destino = normalizarTexto(filtros.destino);
  const fecha = String(filtros.fecha ?? "").slice(0, 10);

  return solicitudes.filter((solicitud) => {
    if (origen && !normalizarTexto(solicitud.origen).includes(origen)) return false;
    if (destino && !normalizarTexto(solicitud.destino).includes(destino)) return false;
    if (fecha && String(solicitud.fechaHora ?? "").slice(0, 10) !== fecha) return false;
    return true;
  });
}

/**
 * Separa las solicitudes que el conductor aún no conocía.
 * Sin historial previo (`null`) la primera consulta solo se memoriza: no se avisa de
 * solicitudes que ya existían antes de que el conductor usara la aplicación.
 * @param {Array<{idSolicitud: number}>} solicitudes Pendientes actuales.
 * @param {number[]|null} vistasPrevias Identificadores ya conocidos, o `null` si no hay historial.
 * @returns {{nuevas: Array, vistas: number[]}} Solicitudes nuevas y el historial actualizado.
 */
export function detectarSolicitudesNuevas(solicitudes, vistasPrevias) {
  // El historial se limita a las pendientes actuales: las aceptadas ya no vuelven.
  const vistas = solicitudes.map((solicitud) => solicitud.idSolicitud);
  if (vistasPrevias === null) return { nuevas: [], vistas };

  const conocidas = new Set(vistasPrevias);
  return {
    nuevas: solicitudes.filter((solicitud) => !conocidas.has(solicitud.idSolicitud)),
    vistas,
  };
}

/**
 * Texto del aviso para el conductor.
 * @param {Array<{origen?: string, destino?: string, nombreUsuario?: string}>} nuevas Solicitudes nuevas (al menos una).
 * @returns {{titulo: string, texto: string}} Título y detalle del aviso.
 */
export function textoAvisoSolicitudes(nuevas) {
  if (nuevas.length === 1) {
    const [solicitud] = nuevas;
    const quien = solicitud.nombreUsuario ? `${solicitud.nombreUsuario}: ` : "";
    return {
      titulo: "Nueva solicitud de viaje",
      texto: `${quien}${solicitud.origen || "Origen"} → ${solicitud.destino || "Destino"}`,
    };
  }
  return {
    titulo: `${nuevas.length} solicitudes nuevas de viaje`,
    texto: "Hay pasajeros esperando un conductor. Revísalas en «Buscar».",
  };
}
