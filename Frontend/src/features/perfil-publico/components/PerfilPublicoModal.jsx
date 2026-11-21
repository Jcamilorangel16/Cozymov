// Ventana con el perfil público de un conductor o de quien solicita un viaje.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  estrellasLlenas,
  formatearMiembroDesde,
  inicialNombre,
} from "../utils/perfil";

function Estrellas({ valor, etiqueta }) {
  const llenas = estrellasLlenas(valor);
  return (
    <span className="text-warning" role="img" aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={`bi ${n <= llenas ? "bi-star-fill" : "bi-star"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/**
 * Muestra nombre, ocupación, antigüedad, estadísticas, vehículos y reseñas
 * (anónimas) de un usuario.
 * @param {{idUsuario: string|number|null, nombre?: string, onCerrar: () => void}} props
 *   `idUsuario` null oculta la ventana; `nombre` se muestra mientras carga.
 */
export default function PerfilPublicoModal({ idUsuario, nombre = "", onCerrar }) {
  if (idUsuario === null || idUsuario === undefined || idUsuario === "") return null;
  // La clave reinicia el estado al cambiar de usuario.
  return (
    <VentanaPerfil key={String(idUsuario)} idUsuario={idUsuario} nombre={nombre} onCerrar={onCerrar} />
  );
}

function VentanaPerfil({ idUsuario, nombre, onCerrar }) {
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");
  const botonCerrar = useRef(null);

  useEffect(() => {
    const controlador = new AbortController();
    fetch(`/api/perfil?id=${encodeURIComponent(idUsuario)}`, {
      cache: "no-store",
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => null);
        if (!respuesta.ok) throw new Error(datos?.error || "No se pudo cargar el perfil.");
        setPerfil(datos);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message || "No se pudo cargar el perfil.");
      });
    return () => controlador.abort();
  }, [idUsuario]);

  useEffect(() => {
    const anterior = document.activeElement;
    botonCerrar.current?.focus();
    const alPulsar = (e) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      if (anterior instanceof HTMLElement) anterior.focus();
    };
  }, [onCerrar]);

  const nombreVisible = perfil?.nombre || nombre || "Usuario";

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onCerrar} />
      <div
        className="modal d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="perfil-publico-titulo"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCerrar();
        }}
      >
        <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h5" id="perfil-publico-titulo">Perfil de {nombreVisible}</h2>
              <button
                ref={botonCerrar}
                type="button"
                className="btn-close"
                aria-label="Cerrar"
                onClick={onCerrar}
              />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger" role="alert">{error}</div>}
              {!perfil && !error && <p role="status">Cargando perfil...</p>}

              {perfil && (
                <>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle bg-primary-subtle text-primary-emphasis d-flex align-items-center justify-content-center fs-2 fw-bold flex-shrink-0"
                      style={{ width: 80, height: 80 }}
                      aria-hidden="true"
                    >
                      {inicialNombre(nombreVisible)}
                    </div>
                    <div>
                      <div className="h5 mb-1">{nombreVisible}</div>
                      {perfil.ocupacion && <div className="texto-secundario">{perfil.ocupacion}</div>}
                      {formatearMiembroDesde(perfil.miembroDesde) && (
                        <small className="texto-secundario">{formatearMiembroDesde(perfil.miembroDesde)}</small>
                      )}
                    </div>
                  </div>

                  <div className="row g-2 text-center mb-3">
                    <div className="col-4">
                      <div className="border rounded-3 p-2 h-100">
                        <div className="fw-bold">
                          {perfil.promedioCalificacion != null
                            ? Number(perfil.promedioCalificacion).toFixed(1)
                            : "—"}
                        </div>
                        <small className="texto-secundario">
                          {perfil.totalCalificaciones === 1
                            ? "1 reseña"
                            : `${perfil.totalCalificaciones ?? 0} reseñas`}
                        </small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded-3 p-2 h-100">
                        <div className="fw-bold">{perfil.viajesPublicados ?? 0}</div>
                        <small className="texto-secundario">Viajes publicados</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="border rounded-3 p-2 h-100">
                        <div className="fw-bold">{perfil.viajesComoPasajero ?? 0}</div>
                        <small className="texto-secundario">Viajes como pasajero</small>
                      </div>
                    </div>
                  </div>

                  {perfil.vehiculos?.length > 0 && (
                    <section className="mb-3" aria-labelledby="perfil-publico-vehiculos">
                      <h3 className="h6 fw-bold" id="perfil-publico-vehiculos">Vehículos</h3>
                      <ul className="list-unstyled mb-0">
                        {perfil.vehiculos.map((v, i) => (
                          <li key={i}>
                            <i className="bi bi-car-front me-1" aria-hidden="true" />
                            {[v.tipo, v.modelo].filter(Boolean).join(" · ")}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section aria-labelledby="perfil-publico-resenas">
                    <h3 className="h6 fw-bold" id="perfil-publico-resenas">Reseñas</h3>
                    {perfil.resenas?.length ? (
                      <ul className="list-unstyled d-flex flex-column gap-2 mb-0">
                        {perfil.resenas.map((r) => (
                          <li key={r.idCalificacion} className="border rounded-3 p-2">
                            <Estrellas valor={r.puntuacion} etiqueta={`${r.puntuacion} de 5 estrellas`} />
                            {r.comentario ? (
                              <p className="mb-0 mt-1">{r.comentario}</p>
                            ) : (
                              <p className="mb-0 mt-1 texto-secundario small">Sin comentario.</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="texto-secundario mb-0">Todavía no tiene reseñas.</p>
                    )}
                    {perfil.totalCalificaciones > (perfil.resenas?.length ?? 0) && (
                      <small className="texto-secundario d-block mt-2">
                        Se muestran las {perfil.resenas.length} reseñas más recientes.
                      </small>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
