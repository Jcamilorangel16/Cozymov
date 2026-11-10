// Presenta el formulario de búsqueda y los viajes activos disponibles.
"use client";

import "../styles/buscar-viajes.css";
import { puedeAceptarViaje } from "../../viajes/validations/viajes";
import { useBuscarViajes } from "../hooks/useBuscarViajes";
import { formatearFecha, formatearPrecio } from "../utils/viajes";

/**
 * Muestra filtros de viaje y resultados de búsqueda.
 * @param {{onEnviarMensaje?: (contacto: {id: string, nombre: string}) => void}} props Acción para abrir el chat con el conductor.
 * @returns Interfaz de búsqueda de viajes.
 */
export default function BuscarViajes({ onEnviarMensaje }) {
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
    eliminandoViajeId,
    handleBuscar,
    handleEliminarViaje,
  } = useBuscarViajes();

  return (
    <div className="search-view container py-4">
      <header className="search-heading">
        <span className="search-eyebrow">TU PRÓXIMO TRAYECTO</span>
        <h1>Encuentra tu viaje</h1>
        <p>Busca rutas compartidas y encuentra una opción que se ajuste a tu día.</p>
      </header>

      <div className="card search-filter-card border-0">
        <div className="card-body p-4">
          <h2 className="search-filter-title">¿A dónde quieres ir?</h2>

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

            <div className="d-flex justify-content-end mt-4">
              <button className="btn search-submit" type="submit" disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar Viajes"}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <section className="search-results mt-4" aria-live="polite">
        {buscando && <p className="text-center" role="status">Consultando viajes...</p>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {busquedaRealizada && (
          <>
            <div className="search-results-heading">
              <div>
                <span className="search-eyebrow">OPCIONES PARA TI</span>
                <h2>
                  {viajes.length} {viajes.length === 1 ? "viaje encontrado" : "viajes encontrados"}
                </h2>
              </div>
              <button
                type="button"
                className="search-adjust-button"
                onClick={() => document.getElementById("buscar-origen")?.focus()}
              >
                <span aria-hidden="true">☷</span> Ajustar búsqueda
              </button>
            </div>
            {viajes.length === 0 ? (
              <div className="search-empty-state">
                <span aria-hidden="true">⌕</span>
                <h3>No encontramos viajes con esos filtros</h3>
                <p>Prueba con otro origen, destino o fecha para ver más opciones.</p>
              </div>
            ) : (
              <div className="search-result-list">
                {viajes.map((viaje) => (
                  <article className="card search-result-card border-0" key={viaje.id_viaje}>
                    <div className="card-body">
                      <div className="search-result-route-row">
                        <div className="search-result-route">
                          <span className="search-route-point" aria-hidden="true">●</span>
                          <div>
                            <span className="search-route-caption">RUTA DEL VIAJE</span>
                            <h3>
                          {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
                            </h3>
                          </div>
                        </div>
                        <div className="search-result-price">
                          <strong>{formatearPrecio(viaje.precio_pasaje)}</strong>
                          <span>por persona</span>
                        </div>
                      </div>
                      <div className="search-result-driver">
                        <span className="search-driver-avatar" aria-hidden="true">
                          {([viaje.primer_nombre, viaje.primer_apellido]
                            .filter(Boolean)
                            .map((nombre) => nombre[0])
                            .join("") || "C").slice(0, 2).toUpperCase()}
                        </span>
                        <span>
                          <small>CONDUCTOR</small>
                          <strong>
                            {[viaje.primer_nombre, viaje.primer_apellido]
                              .filter(Boolean)
                              .join(" ") || "No disponible"}
                          </strong>
                        </span>
                      </div>
                      <div className="search-result-details">
                        <span>
                          <span aria-hidden="true">◷</span>
                          {formatearFecha(viaje.fecha_salida)}
                          {viaje.hora_salida && ` · ${String(viaje.hora_salida).slice(0, 5)}`}
                        </span>
                        <span>
                          <span aria-hidden="true">⌖</span>
                          {viaje.punto_encuentro}
                        </span>
                        <span>
                          <span aria-hidden="true">♧</span>
                          {viaje.cupos_disponibles} {viaje.cupos_disponibles === 1 ? "cupo" : "cupos"}
                        </span>
                        {viaje.informacion_adicional && (
                          <span className="search-additional-info">
                            {viaje.informacion_adicional}
                          </span>
                        )}
                      </div>
                      <div className="search-result-actions">
                        {idUsuario && String(viaje.id_usuario) === idUsuario && (
                          <button
                            className="btn btn-outline-danger"
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
                            className="btn search-message-button"
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
                          className="btn search-accept-button"
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
                          Aceptar viaje <span aria-hidden="true">→</span>
                        </button>
                        {!idUsuario && (
                          <small className="search-action-note">
                            Inicia sesión para poder aceptar un viaje.
                          </small>
                        )}
                        {tieneViajePublicado && (
                          <small className="search-action-note">
                            Solo puedes aceptar un viaje si no tienes uno publicado.
                          </small>
                        )}
                        {idUsuario && !validacionCompletada && (
                          <small className="search-action-note" role="status">
                            Validando tus viajes publicados...
                          </small>
                        )}
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
