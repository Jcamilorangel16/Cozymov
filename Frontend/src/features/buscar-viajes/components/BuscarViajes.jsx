// Presenta el formulario de búsqueda y los viajes activos disponibles.
"use client";

import { puedeAceptarViaje } from "../../viajes/validations/viajes";
import { useBuscarViajes } from "../hooks/useBuscarViajes";
import { formatearFecha, formatearPrecio } from "../utils/viajes";

/**
 * Muestra filtros de viaje y resultados de búsqueda.
 * @returns Interfaz de búsqueda de viajes.
 */
export default function BuscarViajes() {
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
    validacionCompletada,
    idUsuario,
    handleBuscar,
  } = useBuscarViajes();

  return (
    <div className="container py-4">
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="text-center mb-4"> Buscar Viajes</h2>

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
                      <p className="texto-secundario mb-3">
                        Conductor: {[viaje.primer_nombre, viaje.primer_apellido]
                          .filter(Boolean)
                          .join(" ") || "No disponible"}
                      </p>
                      <div className="row g-2">
                        <div className="col-sm-6">
                          <strong>Salida:</strong> {formatearFecha(viaje.fecha_salida)}
                          {viaje.hora_salida && ` · ${String(viaje.hora_salida).slice(0, 5)}`}
                        </div>
                        <div className="col-sm-6">
                          <strong>Punto de encuentro:</strong> {viaje.punto_encuentro}
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
                          <button
                            className="btn btn-success"
                            type="button"
                            disabled={!puedeAceptarViaje(
                              idUsuario,
                              validacionCompletada,
                              tieneViajePublicado,
                            )}
                            title={
                              !idUsuario
                                ? "Inicia sesión para poder aceptar un viaje."
                                : tieneViajePublicado
                                  ? "Ya tienes un viaje publicado."
                                  : undefined
                            }
                          >
                            Aceptar viaje
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
