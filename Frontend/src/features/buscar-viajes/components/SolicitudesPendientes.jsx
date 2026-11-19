// Lista en verde las solicitudes de viaje que ningún conductor ha aceptado todavía.
"use client";

import {
  motivoNoAceptarSolicitud,
  puedeAceptarSolicitud,
} from "../../viajes/validations/viajes";
import { formatearFecha, formatearPresupuestoSolicitud } from "../utils/viajes";

/**
 * Presenta las solicitudes pendientes de otros usuarios y permite aceptarlas.
 * @param {{solicitudes: Array, totalSolicitudes?: number, cargando: boolean, error: string, idUsuario: string, tieneVehiculo: boolean|null, tieneViajeEnCurso: boolean, aceptandoSolicitudId: number|null, onAceptar: (solicitud: object) => void}} props Datos y acciones.
 * @returns Sección de solicitudes pendientes.
 */
export default function SolicitudesPendientes({
  solicitudes,
  totalSolicitudes = solicitudes.length,
  cargando,
  error,
  idUsuario,
  tieneVehiculo,
  tieneViajeEnCurso,
  aceptandoSolicitudId,
  onAceptar,
}) {
  const habilitado = puedeAceptarSolicitud(idUsuario, tieneVehiculo, tieneViajeEnCurso);
  const motivo = motivoNoAceptarSolicitud(idUsuario, tieneVehiculo, tieneViajeEnCurso);

  if (!idUsuario) return null;

  return (
    <section className="mt-4" aria-labelledby="solicitudes-pendientes-titulo">
      <h3 className="h5 mb-3 text-success-emphasis" id="solicitudes-pendientes-titulo">
        Solicitudes de pasajeros ({solicitudes.length})
      </h3>

      {cargando && (
        <p className="texto-secundario" role="status">
          Consultando solicitudes pendientes...
        </p>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {!cargando && !error && solicitudes.length === 0 && (
        <p className="texto-secundario">
          {totalSolicitudes > 0
            ? "Ninguna solicitud coincide con los filtros de búsqueda."
            : "Ahora mismo no hay solicitudes pendientes de otros usuarios."}
        </p>
      )}

      {solicitudes.length > 0 && (
        <div className="d-flex flex-column gap-3">
          {solicitudes.map((solicitud) => (
            <article
              className="card border-success border-2 bg-success-subtle shadow-sm"
              key={solicitud.idSolicitud}
            >
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
                  <div>
                    <span className="badge text-bg-success mb-2">Solicitud de viaje</span>
                    <h4 className="h5 mb-1">
                      {solicitud.origen || "Origen no disponible"}{" "}
                      <span aria-hidden="true">→</span>{" "}
                      {solicitud.destino || "Destino no disponible"}
                    </h4>
                    <p className="mb-0 fw-semibold">
                      {solicitud.nombreUsuario || "Usuario no disponible"}
                    </p>
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
                  {solicitud.horaLimite && (
                    <div className="col-sm-6">
                      <strong>Hora límite:</strong> {String(solicitud.horaLimite).slice(0, 5)}
                    </div>
                  )}
                  <div className="col-12 mt-2">
                    <button
                      className="btn btn-success"
                      type="button"
                      disabled={!habilitado || aceptandoSolicitudId === solicitud.idSolicitud}
                      title={motivo ?? undefined}
                      onClick={() => onAceptar(solicitud)}
                    >
                      {aceptandoSolicitudId === solicitud.idSolicitud
                        ? "Aceptando..."
                        : "Aceptar solicitud"}
                    </button>
                    {motivo && <small className="texto-secundario ms-2">{motivo}</small>}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
