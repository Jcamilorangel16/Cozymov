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
      <button
        type="button"
        className="inicio-tarjeta-detalle"
        onClick={onSeleccionar}
        aria-label={`Ver detalle del viaje de ${conductor}`}
      >
        <span className="fw-semibold letra-contenido d-block">{conductor}</span>
        <span className="d-block texto-secundario">{descripcionVehiculo(viaje)}</span>
        <span className="d-block letra-contenido">
          {formatearPrecio(viaje.precio_pasaje)} · {fechaHoraSalida(viaje)}
        </span>
        <span className="inicio-calificacion">{etiquetaCalificacion(calificacion)}</span>
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
