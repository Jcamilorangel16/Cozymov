// Presenta el formulario de búsqueda y los viajes activos disponibles.
"use client";

import { puedeAceptarViaje } from "../../viajes/validations/viajes";
import { useBuscarViajes } from "../hooks/useBuscarViajes";
import { formatearFecha, formatearPrecio } from "../utils/viajes";
import MisSolicitudes from "./MisSolicitudes";
import SolicitudesPendientes from "./SolicitudesPendientes";

/**
 * Muestra filtros de viaje y resultados de búsqueda.
 * @param {{onEnviarMensaje?: (contacto: {id: string, nombre: string}) => void, onNavigate?: (id: string) => void}} props Acciones para el chat y la navegación.
 * @returns Interfaz de búsqueda de viajes.
 */
export default function BuscarViajes({ onEnviarMensaje, onNavigate, usuarioActualId = "" }) {
  const {
    origen,
    setOrigen,
    destino,
    setDestino,
    fecha,
    setFecha,
    viajes,
    buscando,
    busquedaRealizada,
    error,
    tieneViajePublicado,
    tieneViajeEnCurso,
    validacionCompletada,
    idUsuario,
    eliminandoViajeId,
    aceptandoViajeId,
    handleBuscar,
    handleEliminarViaje,
    handleAceptarViaje,
    solicitudes,
    totalSolicitudes,
    cargandoSolicitudes,
    errorSolicitudes,
    tieneVehiculo,
    aceptandoSolicitudId,
    handleAceptarSolicitud,
    misSolicitudes,
    errorMisSolicitudes,
    eliminandoSolicitudId,
    handleEliminarSolicitud,
  } = useBuscarViajes(usuarioActualId);

  return (
    <div className="container py-4">
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="text-center mb-4 titulo-icono"><i className="bi bi-compass-fill" aria-hidden="true" /> Buscar Viajes</h2>

          <form onSubmit={handleBuscar}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-origen">Origen</label>
                <input
                  id="buscar-origen"
                  type="text"
                  className="form-control"
                  placeholder="Cualquier origen"
                  maxLength={150}
                  value={origen}
                  onChange={(evento) => setOrigen(evento.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-destino">Destino</label>
                <input
                  id="buscar-destino"
                  type="text"
                  className="form-control"
                  placeholder="Cualquier destino"
                  maxLength={150}
                  value={destino}
                  onChange={(evento) => setDestino(evento.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-fecha">Fecha de salida</label>
                <input
                  id="buscar-fecha"
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                />
              </div>
            </div>

            <div className="d-grid mt-4">
              <button className="btn btn-primary btn-lg" type="submit" disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar Viajes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {idUsuario && (
        <MisSolicitudes
          solicitudes={misSolicitudes}
          error={errorMisSolicitudes}
          eliminandoId={eliminandoSolicitudId}
          onEliminar={handleEliminarSolicitud}
        />
      )}

      <SolicitudesPendientes
        solicitudes={solicitudes}
        totalSolicitudes={totalSolicitudes}
        cargando={cargandoSolicitudes}
        error={errorSolicitudes}
        idUsuario={idUsuario}
        tieneVehiculo={tieneVehiculo}
        tieneViajeEnCurso={tieneViajeEnCurso}
        aceptandoSolicitudId={aceptandoSolicitudId}
        onAceptar={(solicitud) =>
          handleAceptarSolicitud(solicitud, () => onNavigate?.("en-curso"))
        }
      />

      <section className="mt-4" aria-live="polite">
        {buscando && <p className="text-center" role="status">Consultando viajes...</p>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {busquedaRealizada && (
          <>
            <h3 className="h5 mb-3">
              {viajes.length} {viajes.length === 1 ? "viaje encontrado" : "viajes encontrados"}
            </h3>
            {viajes.length === 0 ? (
              <p className="texto-secundario">No se encontraron viajes activos con esos filtros.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {viajes.map((viaje) => (
                  <article className="card color-card border-0 shadow-sm" key={viaje.id_viaje}>
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between gap-2">
                        <h4 className="h5 mb-1">
                          {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
                        </h4>
                        <strong>{formatearPrecio(viaje.precio_pasaje)}</strong>
                      </div>
                      <section
                        className="border rounded-3 p-3 my-3"
                        aria-label="Información pública del conductor"
                      >
                        <h5 className="h6 fw-bold letra-contenido">Conductor</h5>
                        <div className="d-flex flex-wrap gap-3 align-items-center">
                          {viaje.foto_vehiculo && (
                            <img
                              src={viaje.foto_vehiculo}
                              alt={`Vehículo de ${viaje.nombre_conductor || viaje.primer_nombre || "el conductor"}`}
                              className="rounded object-fit-cover"
                              width="96"
                              height="72"
                              loading="lazy"
                            />
                          )}
                          <div>
                            <div className="fw-semibold">
                              {viaje.nombre_conductor ||
                                [viaje.primer_nombre, viaje.primer_apellido]
                                  .filter(Boolean)
                                  .join(" ") ||
                                "Nombre no disponible"}
                            </div>
                            {viaje.ocupacion_conductor && (
                              <div className="texto-secundario small">
                                {viaje.ocupacion_conductor}
                              </div>
                            )}
                          </div>
                        </div>
                        {viaje.tipo_vehiculo || viaje.modelo_vehiculo ? (
                          <dl className="row g-2 mt-2 mb-0 small">
                            <dt className="col-sm-4">Vehículo</dt>
                            <dd className="col-sm-8 mb-0">
                              {[viaje.tipo_vehiculo, viaje.modelo_vehiculo]
                                .filter(Boolean)
                                .join(" · ")}
                            </dd>
                            {viaje.capacidad_vehiculo != null && (
                              <>
                                <dt className="col-sm-4">Capacidad</dt>
                                <dd className="col-sm-8 mb-0">
                                  {viaje.capacidad_vehiculo} personas
                                </dd>
                              </>
                            )}
                            {viaje.numero_puertas != null && (
                              <>
                                <dt className="col-sm-4">Puertas</dt>
                                <dd className="col-sm-8 mb-0">
                                  {viaje.numero_puertas}
                                </dd>
                              </>
                            )}
                            {viaje.modalidad_moto && (
                              <>
                                <dt className="col-sm-4">Modalidad</dt>
                                <dd className="col-sm-8 mb-0">
                                  {viaje.modalidad_moto}
                                </dd>
                              </>
                            )}
                          </dl>
                        ) : (
                          <p className="texto-secundario small mb-0 mt-2">
                            No hay información de vehículo disponible.
                          </p>
                        )}
                      </section>
                      <div className="row g-2">
                        <div className="col-sm-6">
                          <strong>Salida:</strong> {formatearFecha(viaje.fecha_salida)}
                          {viaje.hora_salida && ` · ${String(viaje.hora_salida).slice(0, 5)}`}
                        </div>
                        <div className="col-sm-6">
                          {viaje.punto_encuentro && (
                            <>
                              <strong>Punto de encuentro:</strong> {viaje.punto_encuentro}
                            </>
                          )}
                        </div>
                        <div className="col-sm-6">
                          <strong>Cupos disponibles:</strong> {viaje.cupos_disponibles}
                        </div>
                        {viaje.informacion_adicional && (
                          <div className="col-12">
                            <strong>Información adicional:</strong> {viaje.informacion_adicional}
                          </div>
                        )}
                        <div className="col-12 mt-2">
                          {idUsuario && String(viaje.id_usuario) === idUsuario && (
                            <button
                              className="btn btn-outline-danger me-2"
                              type="button"
                              disabled={eliminandoViajeId === viaje.id_viaje}
                              onClick={() => handleEliminarViaje(viaje)}
                            >
                              {eliminandoViajeId === viaje.id_viaje
                                ? "Eliminando..."
                                : "Eliminar viaje"}
                            </button>
                          )}
                          {idUsuario && String(viaje.id_usuario) !== idUsuario && (
                            <button
                              className="btn btn-outline-primary me-2"
                              type="button"
                              onClick={() =>
                                onEnviarMensaje?.({
                                  id: String(viaje.id_usuario),
                                  nombre:
                                    [viaje.primer_nombre, viaje.primer_apellido]
                                      .filter(Boolean)
                                      .join(" ") || "Conductor",
                                })
                              }
                            >
                              Enviar mensaje
                            </button>
                          )}
                          <button
                            className="btn btn-success"
                            type="button"
                            disabled={
                              !puedeAceptarViaje(
                                idUsuario,
                                validacionCompletada,
                                tieneViajePublicado,
                                tieneViajeEnCurso,
                              ) ||
                              aceptandoViajeId === viaje.id_viaje ||
                              Number(viaje.cupos_disponibles) < 1
                            }
                            onClick={() =>
                              handleAceptarViaje(viaje, () => onNavigate?.("en-curso"))
                            }
                            title={
                              !idUsuario
                                ? "Inicia sesión para poder aceptar un viaje."
                                : tieneViajePublicado
                                  ? "Ya tienes un viaje publicado."
                                  : tieneViajeEnCurso
                                    ? "Ya tienes un viaje en curso."
                                    : Number(viaje.cupos_disponibles) < 1
                                      ? "Este viaje ya no tiene cupos disponibles."
                                      : undefined
                            }
                          >
                            {aceptandoViajeId === viaje.id_viaje
                              ? "Aceptando..."
                              : "Aceptar viaje"}
                          </button>
                          {!idUsuario && (
                            <small className="texto-secundario ms-2">
                              Inicia sesión para poder aceptar un viaje.
                            </small>
                          )}
                          {tieneViajePublicado && (
                            <small className="texto-secundario ms-2">
                              Solo puedes aceptar un viaje si no tienes uno publicado.
                            </small>
                          )}
                          {tieneViajeEnCurso && (
                            <small className="texto-secundario ms-2">
                              Ya tienes un viaje en curso.
                            </small>
                          )}
                          {idUsuario && !validacionCompletada && (
                            <small className="texto-secundario ms-2" role="status">
                              Validando tus viajes publicados...
                            </small>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
