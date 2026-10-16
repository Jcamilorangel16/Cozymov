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

export default function BuscarViajes({
  viajeSeleccionado,
  setViajeSeleccionado,
  mensajeAccion,
  setMensajeAccion,
}) {
  const [origenBusqueda, setOrigenBusqueda] = useState("Norte");
  const [destinoBusqueda, setDestinoBusqueda] = useState("Campus Sur");
  const [viajesEncontrados, setViajesEncontrados] = useState(resultadosViajes);

  function buscarViajes() {
    const origen = origenBusqueda.trim().toLocaleLowerCase();
    const destino = destinoBusqueda.trim().toLocaleLowerCase();

    setViajesEncontrados(
      resultadosViajes.filter((viaje) => {
        const ruta = viaje.ruta.toLocaleLowerCase();
        return ruta.includes(origen) && ruta.includes(destino);
      }),
    );
    setViajeSeleccionado(null);
    setMensajeAccion("");
  }

  function solicitarUnirse() {
    setMensajeAccion(`Tu solicitud para unirte al viaje de ${viajeSeleccionado.nombre} está lista.`);
  }

  return (
    <div className="vista">
      {viajeSeleccionado === null ? (
        <div>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h3 className="mb-0 letra-contenido">Buscar Viaje</h3>

            <div className="d-flex flex-wrap gap-2">
              <div className="input-group" style={{ width: 150 }}>
                <span className="input-group-text">📍</span>
                <input
                  type="text"
                  className="form-control"
                  value={origenBusqueda}
                  onChange={(evento) => setOrigenBusqueda(evento.target.value)}
                />
              </div>
              <div className="input-group" style={{ width: 160 }}>
                <span className="input-group-text">🏁</span>
                <input
                  type="text"
                  className="form-control"
                  value={destinoBusqueda}
                  onChange={(evento) => setDestinoBusqueda(evento.target.value)}
                />
              </div>
              <div className="input-group" style={{ width: 150 }}>
                <span className="input-group-text">📅</span>
                <input type="date" className="form-control" />
              </div>
              <button type="button" className="btn btn-primary" onClick={buscarViajes}>
                Buscar
              </button>
            </div>
          </div>

          <p className="texto-secundario fw-semibold mb-3">{viajesEncontrados.length} resultados encontrados</p>

          <div className="d-flex flex-column gap-3">
            {viajesEncontrados.map((viaje) => (
              <div
                className="card p-3 color-card"
                style={{ cursor: "pointer" }}
                key={viaje.nombre}
                onClick={() => {
                  setViajeSeleccionado(viaje);
                  setMensajeAccion("");
                }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <div className={"user-avatar " + viaje.avatarColor} style={{ width: 38, height: 38, fontSize: 13 }}>
                      {viaje.iniciales}
                    </div>
                    <div>
                      <div className="fw-bold letra-contenido">{viaje.nombre}</div>
                      <small className="texto-secundario">★ {viaje.rating} · {viaje.horario}</small>
                    </div>
                  </div>
                  <span className="fs-4 texto-secundario">›</span>
                </div>
                <div className="texto-secundario small mt-2">{viaje.vehiculo}</div>
                <span className="badge bg-success mt-2">{viaje.cupos}</span>
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
