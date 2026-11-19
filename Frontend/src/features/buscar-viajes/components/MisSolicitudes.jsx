// Muestra al pasajero sus solicitudes de viaje pendientes y le deja eliminarlas.
"use client";

import { formatearFecha, formatearPresupuestoSolicitud } from "../utils/viajes";

/**
 * Lista en verde las solicitudes propias que ningún conductor ha aceptado todavía.
 * @param {{solicitudes: Array, error: string, eliminandoId: number|null, onEliminar: (solicitud: object) => void}} props Datos y acciones.
 * @returns Sección «Tus solicitudes» o `null` si no hay nada que mostrar.
 */
export default function MisSolicitudes({ solicitudes, error, eliminandoId, onEliminar }) {
  if (solicitudes.length === 0 && !error) return null;

  return (
    <section className="mt-4" aria-labelledby="mis-solicitudes-titulo">
      <h3 className="h5 mb-3 text-success-emphasis" id="mis-solicitudes-titulo">
        Tus solicitudes ({solicitudes.length})
      </h3>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {solicitudes.map((solicitud) => (
          <article
            className="card border-success border-2 bg-success-subtle shadow-sm"
            key={solicitud.idSolicitud}
          >
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                <div>
                  <span className="badge text-bg-success mb-2">Tu solicitud</span>
                  <span className="badge text-bg-light border border-success text-success-emphasis ms-1 mb-2">
                    Esperando conductor
                  </span>
                  <h4 className="h5 mb-0">
                    {solicitud.origen || "Origen no disponible"} <span aria-hidden="true">→</span>{" "}
                    {solicitud.destino || "Destino no disponible"}
                  </h4>
                </div>
                <strong className="text-success-emphasis">
                  {formatearPresupuestoSolicitud(solicitud.presupuesto)}
                </strong>
              </div>

              <div className="row g-2 mt-2">
                <div className="col-sm-6">
                  <strong>Salida:</strong> {formatearFecha(solicitud.fechaHora)}
                  {String(solicitud.fechaHora ?? "").slice(11, 16) &&
                    ` · ${String(solicitud.fechaHora).slice(11, 16)}`}
                </div>
                <div className="col-12 mt-2">
                  <button
                    className="btn btn-outline-danger"
                    type="button"
                    disabled={eliminandoId === solicitud.idSolicitud}
                    onClick={() => onEliminar(solicitud)}
                  >
                    {eliminandoId === solicitud.idSolicitud ? "Eliminando..." : "Eliminar solicitud"}
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
