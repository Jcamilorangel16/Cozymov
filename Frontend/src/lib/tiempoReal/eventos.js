// Contratos de los eventos de tiempo real (espejo de Backend/TiempoReal/EventosTiempoReal.cs)
// y política de reintentos. Lógica pura: no depende de SignalR ni del navegador.

/** Versión de los contratos que entiende este cliente. */
export const VERSION_EVENTOS = 1;

/** Nombres de los eventos en el cable (métodos de ITiempoRealCliente). */
export const EVENTOS = Object.freeze({
  MENSAJE_NUEVO: "MensajeNuevo",
  MENSAJES_LEIDOS: "MensajesLeidos",
  VIAJE_ACTUALIZADO: "ViajeActualizado",
});

export const NOMBRES_EVENTOS = Object.freeze(Object.values(EVENTOS));

/** Motivos de ViajeActualizado (MotivoViaje en el backend). */
export const MOTIVOS_VIAJE = Object.freeze({
  RESERVA_CREADA: "reserva-creada",
  SOLICITUD_ACEPTADA: "solicitud-aceptada",
  RESERVA_CANCELADA: "reserva-cancelada",
  RESERVA_FINALIZADA: "reserva-finalizada",
  VIAJE_CANCELADO: "viaje-cancelado",
  VIAJE_MODIFICADO: "viaje-modificado",
  VIAJE_ELIMINADO: "viaje-eliminado",
});

const esId = (valor) => Number.isSafeInteger(valor) && valor > 0;
const esTexto = (valor, maximo) => typeof valor === "string" && valor.length <= maximo;

/**
 * Valida un evento recibido y devuelve solo los campos del contrato.
 * Un evento de otra versión o con datos inesperados devuelve null: quien lo recibe
 * no lo interpreta y se resincroniza por HTTP.
 * @param {string} nombre Nombre del evento.
 * @param {unknown} datos Cuerpo recibido.
 * @returns {object|null} Evento normalizado o null.
 */
export function normalizarEvento(nombre, datos) {
  if (typeof datos !== "object" || datos === null || datos.version !== VERSION_EVENTOS) {
    return null;
  }

  switch (nombre) {
    case EVENTOS.MENSAJE_NUEVO: {
      const { idMensaje, idEmisor, idReceptor, nombreEmisor, contenido, fechaHora } = datos;
      if (
        !esId(idMensaje) ||
        !esId(idEmisor) ||
        !esId(idReceptor) ||
        !esTexto(nombreEmisor, 200) ||
        !esTexto(contenido, 500) ||
        !esTexto(fechaHora, 40)
      ) {
        return null;
      }
      return { version: VERSION_EVENTOS, idMensaje, idEmisor, idReceptor, nombreEmisor, contenido, fechaHora };
    }
    case EVENTOS.MENSAJES_LEIDOS: {
      const { idLector, idEmisor, hastaIdMensaje } = datos;
      if (!esId(idLector) || !esId(idEmisor) || !esId(hastaIdMensaje)) return null;
      return { version: VERSION_EVENTOS, idLector, idEmisor, hastaIdMensaje };
    }
    case EVENTOS.VIAJE_ACTUALIZADO: {
      const { motivo, idViaje } = datos;
      // Un motivo nuevo de la misma versión se acepta: quien lo recibe vuelve a consultar.
      if (!esTexto(motivo, 40) || !motivo || !esId(idViaje)) return null;
      return { version: VERSION_EVENTOS, motivo, idViaje };
    }
    default:
      return null;
  }
}

/** Espera antes de cada reintento: inmediato, luego 2, 5, 10, 20 y 30 s como máximo. */
const ESCALA_MS = [0, 2_000, 5_000, 10_000, 20_000, 30_000];

/**
 * Espera progresiva con variación aleatoria (±20 %), para que muchas pestañas que
 * perdieron la conexión a la vez no vuelvan todas en el mismo instante. Nunca se
 * rinde: con el servidor caído reintenta cada ~30 s mientras la app siga abierta.
 * @param {number} intento Reintentos ya hechos (0 para el primero).
 * @param {() => number} aleatorio Generador en [0, 1).
 * @returns {number} Milisegundos a esperar.
 */
export function retrasoReintento(intento, aleatorio = Math.random) {
  const indice = Math.min(Math.max(0, Math.trunc(intento) || 0), ESCALA_MS.length - 1);
  const base = ESCALA_MS[indice];
  if (base === 0) return 0;
  return Math.round(base * (0.8 + 0.4 * aleatorio()));
}
