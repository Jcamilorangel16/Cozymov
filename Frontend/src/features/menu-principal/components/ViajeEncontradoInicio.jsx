"use client";

import { formatearPrecio } from "../../buscar-viajes/utils/viajes";
import {
  descripcionVehiculo,
  etiquetaCalificacion,
  fechaHoraSalida,
} from "../utils/destinosInicio";

/**
 * Vista destacada de un viaje encontrado.
 * @param {{viaje: object, calificacion: object|undefined, aceptando: boolean, onAceptar: () => void, onVolver?: () => void}} props
 * @returns Tarjeta con el detalle y el botón Aceptar viaje.
 */
export default function ViajeEncontradoInicio({
  viaje,
  calificacion,
  aceptando,
  onAceptar,
  onVolver,
}) {
  return (
    <section className="viaje-item inicio-destacado" aria-labelledby="inicio-viaje-titulo">
      <h2 className="h5 letra-contenido" id="inicio-viaje-titulo">
        <i className="bi bi-emoji-smile-fill me-2" aria-hidden="true" />¡Viaje encontrado a {viaje.destino}!
      </h2>
      <dl className="inicio-datos">
        <div>
          <dt><i className="bi bi-cash-coin" aria-hidden="true" /> Precio</dt>
          <dd>{formatearPrecio(viaje.precio_pasaje)}</dd>
        </div>
        <div>
          <dt><i className="bi bi-clock-fill" aria-hidden="true" /> Salida</dt>
          <dd>{fechaHoraSalida(viaje)}</dd>
        </div>
        <div>
          <dt><i className="bi bi-person-circle" aria-hidden="true" /> Conductor</dt>
          <dd>
            {viaje.nombre_conductor || "Conductor sin nombre"}{" "}
            <span className="inicio-calificacion">{etiquetaCalificacion(calificacion)}</span>
          </dd>
        </div>
        <div>
          <dt><i className="bi bi-car-front-fill" aria-hidden="true" /> Vehículo</dt>
          <dd>{descripcionVehiculo(viaje)}</dd>
        </div>
      </dl>
      <p className="texto-secundario small mb-3">
        Se muestra la hora de salida. La duración estimada del viaje no está disponible.
      </p>
      <div className="d-flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-reservar"
          onClick={onAceptar}
          disabled={aceptando}
        >
          {aceptando ? "Aceptando..." : "Aceptar viaje"}
        </button>
        {onVolver && (
          <button type="button" className="btn btn-outline-primary" onClick={onVolver}>
            Ver otros viajes
          </button>
        )}
      </div>
    </section>
  );
}
