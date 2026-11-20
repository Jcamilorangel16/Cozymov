// Qué decirle al usuario cuando la otra parte cambia el viaje que está viendo en «En curso».
import { MOTIVOS_VIAJE } from "../../../lib/tiempoReal/eventos.js";

/**
 * Aviso para un evento ViajeActualizado, o null si no hace falta (por ejemplo, cuando el
 * cambio lo hizo el propio usuario: quien sale del viaje no necesita que se le avise).
 * @param {{motivo: string, rolAnterior: "pasajero"|"conductor"|null, rolNuevo: "pasajero"|"conductor"|null}} cambio
 *   Rol con el que se mostraba el viaje antes del evento y después de volver a consultarlo
 *   (null si no había viaje).
 * @returns {{icono: string, titulo: string, texto: string}|null}
 */
export function avisoCambioViaje({ motivo, rolAnterior, rolNuevo }) {
  switch (motivo) {
    case MOTIVOS_VIAJE.RESERVA_CREADA:
      return rolNuevo === "conductor"
        ? { icono: "success", titulo: "¡Tienes un pasajero!", texto: "Un pasajero se unió a tu viaje." }
        : null;
    case MOTIVOS_VIAJE.SOLICITUD_ACEPTADA:
      return rolNuevo === "pasajero" && rolAnterior !== "pasajero"
        ? {
            icono: "success",
            titulo: "¡Aceptaron tu solicitud!",
            texto: "Un conductor aceptó tu solicitud de viaje.",
          }
        : null;
    case MOTIVOS_VIAJE.RESERVA_CANCELADA:
      return rolAnterior === "conductor"
        ? {
            icono: "info",
            titulo: "Un pasajero salió del viaje",
            texto:
              rolNuevo === "conductor"
                ? "Tu viaje sigue con los demás pasajeros."
                : "Ya no tienes pasajeros en este viaje.",
          }
        : null;
    case MOTIVOS_VIAJE.RESERVA_FINALIZADA:
      return rolAnterior === "conductor"
        ? {
            icono: "success",
            titulo: "Tu pasajero finalizó el viaje",
            texto: "Tu pasajero llegó a su destino y finalizó su viaje.",
          }
        : null;
    case MOTIVOS_VIAJE.VIAJE_CANCELADO:
    case MOTIVOS_VIAJE.VIAJE_ELIMINADO:
      return rolAnterior === "pasajero"
        ? {
            icono: "warning",
            titulo: "El conductor canceló el viaje",
            texto:
              "Tu reserva se canceló. Si el viaje venía de tu solicitud, esta vuelve a quedar disponible para otros conductores.",
          }
        : null;
    case MOTIVOS_VIAJE.VIAJE_MODIFICADO:
      return rolAnterior === "pasajero" && rolNuevo === "pasajero"
        ? {
            icono: "info",
            titulo: "El conductor actualizó el viaje",
            texto: "Revisa la hora de salida y el precio.",
          }
        : null;
    default:
      return null;
  }
}
