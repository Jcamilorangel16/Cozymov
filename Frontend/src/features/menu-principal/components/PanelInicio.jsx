"use client";

// Muestra viajes disponibles y actividad real de la cuenta.
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatearFecha, formatearPrecio } from "../../buscar-viajes/utils/viajes";
import { usePanelInicio } from "../hooks/usePanelInicio";
import "../../viaje-en-curso/styles/viaje-en-curso.css";

const MapaRuta = dynamic(() => import("../../viaje-en-curso/components/MapaRuta"), {
  ssr: false,
  loading: () => (
    <div className="mapa-ruta mapa-cargando" role="status">
      <p className="text-center texto-secundario m-0">Cargando mapa…</p>
    </div>
  ),
});

/**
 * Renderiza el resumen inicial del menú principal.
 * @param {{onNavigate: (id: string) => void, onBuscarRuta: (ruta: {origen: string, destino: string}, intencion: string) => void}} props Navegación y búsqueda de ruta.
 * @returns Panel de inicio.
 */
export default function PanelInicio({ onNavigate, onBuscarRuta }) {
  const {
    idUsuario,
    viajes,
    viajePublicado,
    viajeReservado,
    cargando,
    error,
    reintentar,
  } = usePanelInicio();
  const [origenFiltro, setOrigenFiltro] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [rutaSeleccionada, setRutaSeleccionada] = useState(null);

  const viajesFiltrados = useMemo(() => {
    const origen = origenFiltro.trim().toLocaleLowerCase("es");
    return viajes.filter((viaje) => (
      (!origen || String(viaje.origen || "").toLocaleLowerCase("es").includes(origen)) &&
      (!fechaFiltro || String(viaje.fecha_salida || "").slice(0, 10) === fechaFiltro)
    ));
  }, [viajes, origenFiltro, fechaFiltro]);

  const viajesPropios = [viajeReservado, viajePublicado]
    .filter(Boolean)
    .sort((a, b) => String(a.fecha_salida).localeCompare(String(b.fecha_salida)));

  if (!idUsuario) {
    return (
      <div className="alert alert-warning" role="alert">
        Inicia sesión para consultar los viajes disponibles y tu actividad.
      </div>
    );
  }

  return (
    <div className="vista">
      <section className="mb-4" aria-labelledby="inicio-mapa-titulo">
        <h3 id="inicio-mapa-titulo" className="mb-3 letra-contenido">
          Elige tu ruta
        </h3>
        <MapaRuta onRutaSeleccionada={setRutaSeleccionada} />
        <div className="panel-lateral mt-3">
          <h4 className="h5 letra-contenido fw-bold">¿Qué quieres hacer?</h4>
          <p className="texto-secundario mb-3">
            Selecciona y confirma un origen y un destino para continuar.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-success"
              disabled={!rutaSeleccionada}
              onClick={() => onBuscarRuta(rutaSeleccionada, "solicitar")}
            >
              Solicitar un viaje
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!rutaSeleccionada}
              onClick={() => onBuscarRuta(rutaSeleccionada, "buscar")}
            >
              Buscar viajes publicados
            </button>
          </div>
        </div>
      </section>

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 letra-contenido">Tu Panel de Control</h3>

        <div className="d-flex flex-wrap gap-2">
          <div className="input-group" style={{ width: 200 }}>
            <span className="input-group-text" aria-hidden="true">🔍</span>
            <input
              type="text"
              className="form-control"
              placeholder="Origen..."
              aria-label="Filtrar por origen"
              value={origenFiltro}
              onChange={(evento) => setOrigenFiltro(evento.target.value)}
            />
          </div>

          <div className="input-group" style={{ width: 170 }}>
            <span className="input-group-text" aria-hidden="true">📅</span>
            <input
              type="date"
              className="form-control"
              aria-label="Fecha del viaje"
              value={fechaFiltro}
              onChange={(evento) => setFechaFiltro(evento.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("ofrecer")}
          >
            + Ofrecer viaje
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <h5 className="mb-3 letra-contenido fw-bold">Viajes para ti</h5>
          {cargando ? (
            <p role="status">Cargando viajes disponibles...</p>
          ) : error ? (
            <div className="alert alert-danger" role="alert">
              <p>{error}</p>
              <button type="button" className="btn btn-outline-danger" onClick={reintentar}>
                Reintentar
              </button>
            </div>
          ) : viajesFiltrados.length === 0 ? (
            <p className="texto-secundario">
              No hay viajes disponibles con esos filtros.
            </p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {viajesFiltrados.slice(0, 5).map((viaje) => (
                <article className="viaje-item" key={viaje.id_viaje}>
                  <div className="viaje-hora">
                    <span className="viaje-hora-valor">
                      {viaje.hora_salida || "Hora sin definir"}
                    </span>
                    <small className="texto-secundario">
                      {formatearFecha(viaje.fecha_salida)}
                    </small>
                  </div>

                  <div className="viaje-info">
                    <div className="fw-semibold letra-contenido">
                      {viaje.origen} → {viaje.destino}
                    </div>
                    <span
                      className={`viaje-cupos${Number(viaje.cupos_disponibles) === 1 ? " viaje-cupos-ultimo" : ""}`}
                    >
                      {Number(viaje.cupos_disponibles) === 1
                        ? "Última plaza"
                        : `${viaje.cupos_disponibles} plazas libres`}
                    </span>
                    <small className="d-block texto-secundario">
                      {formatearPrecio(viaje.precio_pasaje)}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-reservar"
                    onClick={() => onNavigate("buscar")}
                  >
                    Buscar viaje
                  </button>
                </article>
              ))}
            </div>
          )}
          {!cargando && !error && viajes.length > 5 && (
            <button
              type="button"
              className="btn btn-outline-primary mt-3"
              onClick={() => onNavigate("buscar")}
            >
              Ver todos los viajes
            </button>
          )}
        </div>

        <div className="col-md-4">
          <section className="panel-lateral mb-4">
            <h5 className="letra-contenido fw-bold mb-3">Tu próximo viaje</h5>
            {cargando ? (
              <p role="status">Consultando tus viajes...</p>
            ) : error ? (
              <p className="texto-secundario">No se pudo consultar tu próximo viaje.</p>
            ) : viajesPropios.length > 0 ? (
              <div className="proximo-destacado">
                <small className="proximo-dia">
                  {viajesPropios[0].fecha_salida
                    ? `${formatearFecha(viajesPropios[0].fecha_salida)}${viajesPropios[0].hora_salida ? ` · ${viajesPropios[0].hora_salida}` : ""}`
                    : "Fecha sin definir"}
                </small>
                <div className="fw-bold letra-contenido">
                  {viajesPropios[0].origen} → {viajesPropios[0].destino}
                </div>
                <small className="texto-secundario">
                  {viajeReservado && String(viajeReservado.id_viaje) === String(viajesPropios[0].id_viaje)
                    ? "Viaje reservado"
                    : "Viaje publicado"}
                </small>
              </div>
            ) : (
              <p className="texto-secundario mb-0">No tienes viajes próximos.</p>
            )}
          </section>

          <h5 className="mb-3 letra-contenido fw-bold">Estado de tus viajes</h5>
          {!idUsuario ? (
            <p className="texto-secundario">Inicia sesión para consultar tus viajes.</p>
          ) : cargando ? (
            <p role="status">Consultando tus viajes...</p>
          ) : error ? (
            <p className="texto-secundario">No se pudo consultar el estado de tus viajes.</p>
          ) : viajesPropios.length > 0 ? (
            <div className="d-flex flex-column gap-2">
              {viajesPropios.map((viaje) => (
                <div className="actividad-item" key={`${viaje.id_viaje}-${viaje.id_conductor}`}>
                  <span className="actividad-icono" aria-hidden="true">🚗</span>
                  <div>
                    <div className="fw-semibold letra-contenido small">
                      {viajeReservado && String(viajeReservado.id_viaje) === String(viaje.id_viaje)
                        ? "Reserva activa"
                        : "Viaje publicado"}
                    </div>
                    <small className="texto-secundario">
                      {viaje.origen} → {viaje.destino}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="texto-secundario">Aún no tienes viajes activos.</p>
          )}
        </div>
      </div>
    </div>
  );
}
