"use client";
import { useState } from "react";
import "./BuscarViajes.css";
import { useState } from "react";

const resultadosViajes = [
  {
    nombre: "Carlos Monteno", iniciales: "CM", avatarColor: "bg-danger",
    rating: "4.8", viajes: "37", ruta: "Norte → Campus Sur",
    horario: "Hoy · 6:50 AM", vehiculo: "Nissan Versa gris (ABC-123)",
    punto: "Entrada Norte", cupos: "2 lugares libres",
  },
  {
    nombre: "Sara Tomato", iniciales: "ST", avatarColor: "bg-primary",
    rating: "4.9", viajes: "52", ruta: "Norte → Campus Sur",
    horario: "Hoy · 10:50 AM", vehiculo: "Chevrolet Onix azul (XYZ-987)",
    punto: "Estación Central", cupos: "4 lugares libres",
  },
  {
    nombre: "Diego Lopez", iniciales: "DL", avatarColor: "bg-warning text-dark",
    rating: "4.5", viajes: "19", ruta: "Norte → Campus Sur",
    horario: "Mañana · 6:00 AM", vehiculo: "Renault Logan blanco (KLO-456)",
    punto: "Portal Norte", cupos: "1 lugar libre",
  },
];

const rutasFrecuentes = [
  { origen: "Campus Sur", destino: "Centro" },
  { origen: "Campus Norte", destino: "Centro" },
  { origen: "Norte", destino: "Campus Sur" },
];

export default function BuscarViajes({
  viajeSeleccionado,
  setViajeSeleccionado,
  mensajeAccion,
  setMensajeAccion,
}) {
  const [origenBusqueda, setOrigenBusqueda] = useState("Norte");
  const [destinoBusqueda, setDestinoBusqueda] = useState("Campus Sur");
  const [viajesEncontrados, setViajesEncontrados] = useState(resultadosViajes);

  // Sin argumentos usa los campos del formulario; las rutas frecuentes pasan su propio origen y destino.
  function buscarViajes(origenParam = origenBusqueda, destinoParam = destinoBusqueda) {
    const origen = origenParam.trim().toLocaleLowerCase();
    const destino = destinoParam.trim().toLocaleLowerCase();

    setViajesEncontrados(
      resultadosViajes.filter((viaje) => {
        const ruta = viaje.ruta.toLocaleLowerCase();
        return ruta.includes(origen) && ruta.includes(destino);
      }),
    );
    setViajeSeleccionado(null);
    setMensajeAccion("");
  }

  function usarRutaFrecuente(ruta) {
    setOrigenBusqueda(ruta.origen);
    setDestinoBusqueda(ruta.destino);
    buscarViajes(ruta.origen, ruta.destino);
  }

  function solicitarUnirse() {
    setMensajeAccion(`Tu solicitud para unirte al viaje de ${viajeSeleccionado.nombre} está lista.`);
  }

  return (
    <div className="vista">
      {viajeSeleccionado === null ? (
        <div>
          {/* Buscador */}
          <section className="buscador">
            <h3 className="buscador-titulo">¿A dónde vas hoy?</h3>
            <p className="buscador-subtitulo">Comparte el trayecto con otros estudiantes de tu campus.</p>

            <div className="buscador-barra">
              <label className="buscador-campo">
                <span className="buscador-etiqueta">Origen</span>
                <input
                  type="text"
                  placeholder="Campus Sur"
                  value={origenBusqueda}
                  onChange={(evento) => setOrigenBusqueda(evento.target.value)}
                />
              </label>

              <label className="buscador-campo">
                <span className="buscador-etiqueta">Destino</span>
                <input
                  type="text"
                  placeholder="Centro"
                  value={destinoBusqueda}
                  onChange={(evento) => setDestinoBusqueda(evento.target.value)}
                />
              </label>

              <label className="buscador-campo">
                <span className="buscador-etiqueta">Fecha</span>
                <input type="date" />
              </label>

              <button type="button" className="buscador-boton" onClick={() => buscarViajes()}>
                Buscar viaje
              </button>
            </div>

            <div className="buscador-rutas">
              <span className="buscador-rutas-label">Rutas frecuentes:</span>
              {rutasFrecuentes.map((ruta) => (
                <button
                  type="button"
                  className="buscador-ruta"
                  key={ruta.origen + ruta.destino}
                  onClick={() => usarRutaFrecuente(ruta)}
                >
                  {ruta.origen} → {ruta.destino}
                </button>
              ))}
            </div>
          </section>

          {/* Resultados */}
          <p className="letra-contenido fw-bold mt-4 mb-3">
            {viajesEncontrados.length === 1
              ? "1 resultado encontrado"
              : `${viajesEncontrados.length} resultados encontrados`}
          </p>

          <div className="d-flex flex-column gap-3">
            {viajesEncontrados.map((viaje) => (
              <div
                className="resultado-item"
                role="button"
                tabIndex={0}
                key={viaje.nombre}
                onClick={() => {
                  setViajeSeleccionado(viaje);
                  setMensajeAccion("");
                }}
                onKeyDown={(evento) => {
                  if (evento.key === "Enter") {
                    setViajeSeleccionado(viaje);
                    setMensajeAccion("");
                  }
                }}
              >
                <div className={"user-avatar " + viaje.avatarColor} style={{ width: 44, height: 44, fontSize: 14 }}>
                  {viaje.iniciales}
                </div>

                <div className="resultado-info">
                  <div className="fw-bold letra-contenido">{viaje.nombre}</div>
                  <small className="texto-secundario d-block">★ {viaje.rating} · {viaje.viajes} viajes</small>
                  <small className="resultado-vehiculo d-block">{viaje.vehiculo}</small>
                </div>

                <div className="resultado-detalle">
                  <div className="fw-semibold letra-contenido">{viaje.horario}</div>
                  <span className={"viaje-cupos" + (viaje.cupos.startsWith("1 ") ? " viaje-cupos-ultimo" : "")}>
                    {viaje.cupos}
                  </span>
                </div>

                <span className="fs-4 texto-secundario" aria-hidden="true">›</span>
              </div>
            ))}
            {viajesEncontrados.length === 0 && (
              <p className="texto-secundario">No se encontraron viajes para esa ruta.</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-link texto-secundario ps-0 mb-3"
            onClick={() => {
              setViajeSeleccionado(null);
              setMensajeAccion("");
            }}
          >
            ‹ Volver a resultados
          </button>

          <div className="row g-3">
            <div className="col-lg-5">
              <div className="card p-3 color-card">
                <h5 className="letra-contenido mb-0">{viajeSeleccionado.ruta}</h5>
                <small className="texto-secundario d-block mb-3">{viajeSeleccionado.horario}</small>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className={"user-avatar " + viajeSeleccionado.avatarColor} style={{ width: 42, height: 42 }}>
                    {viajeSeleccionado.iniciales}
                  </div>
                  <div>
                    <div className="fw-semibold letra-contenido">{viajeSeleccionado.nombre}</div>
                    <small className="texto-secundario">★ {viajeSeleccionado.rating} · {viajeSeleccionado.viajes} viajes</small>
                  </div>
                </div>

                <small className="texto-secundario d-block">Vehículo</small>
                <p className="letra-contenido fw-semibold mb-2">{viajeSeleccionado.vehiculo}</p>

                <small className="texto-secundario d-block">Punto de encuentro</small>
                <p className="fw-semibold mb-2" style={{ color: "#a03c3c" }}>{viajeSeleccionado.punto}</p>

                <small className="texto-secundario d-block">Lugares disponibles</small>
                <p className="fw-semibold mb-3" style={{ color: "#1457e7" }}>{viajeSeleccionado.cupos}</p>

                <button type="button" className="btn btn-primary w-100" onClick={solicitarUnirse}>
                  Solicitar unirme
                </button>
                {mensajeAccion && <p className="alert alert-success mt-3 mb-0">{mensajeAccion}</p>}
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card color-card p-3 h-100 d-flex align-items-center justify-content-center text-center">
                <div style={{ fontSize: "3.5rem" }}>🗺️</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}