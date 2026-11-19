"use client";

import { formatearPrecio } from "../../buscar-viajes/utils/viajes";
import {
  descripcionVehiculo,
  etiquetaCalificacion,
  fechaHoraSalida,
} from "../utils/destinosInicio";

/**
 * Tarjeta resumida de un viaje dentro de la lista de resultados.
 * @param {{viaje: object, calificacion: object|undefined, aceptando: boolean, onSeleccionar: () => void, onAceptar: () => void}} props
 * @returns Tarjeta con datos del viaje y botón Aceptar.
 */
export default function TarjetaViajeResumenInicio({
  viaje,
  calificacion,
  aceptando,
  onSeleccionar,
  onAceptar,
}) {
  const conductor = viaje.nombre_conductor || "Conductor sin nombre";

  return (
    <article className="viaje-item inicio-tarjeta">
      <span className="tarjeta-hora" aria-label={`Salida a las ${viaje.hora_salida || "hora no disponible"}`}>
        <i className="bi bi-clock-fill" aria-hidden="true" />
        <strong>{viaje.hora_salida ? String(viaje.hora_salida).slice(0, 5) : "--:--"}</strong>
      </span>
      <button
        type="button"
        className="inicio-tarjeta-detalle"
        onClick={onSeleccionar}
        aria-label={`Ver detalle del viaje de ${conductor}`}
      >
        <span className="fw-semibold letra-contenido d-block"><i className="bi bi-person-fill me-1" aria-hidden="true" />{conductor}</span>
        <span className="d-block texto-secundario"><i className="bi bi-speedometer2 me-1" aria-hidden="true" />{descripcionVehiculo(viaje)}</span>
        <span className="d-block letra-contenido"><i className="bi bi-cash-coin me-1" aria-hidden="true" />
          {formatearPrecio(viaje.precio_pasaje)} · {fechaHoraSalida(viaje)}
        </span>
        <span className="inicio-calificacion"><i className="bi bi-star-fill me-1" aria-hidden="true" />{etiquetaCalificacion(calificacion)}</span>
      </button>
      <button
        type="button"
        className="btn-reservar"
        onClick={onAceptar}
        disabled={aceptando}
      >
        {aceptando ? "Aceptando..." : "Aceptar"}
      </button>
    </article>
  );
}
