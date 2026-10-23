// eslint-disable react/jsx-no-undef
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import MensajesView from "../../mensajes/MensajesView";
import "./menu-principal.css";

// Datos de ejemplo mantenidos al integrar los cambios del menú principal.
const enlacesMenu = [
  { id: "inicio", label: "Inicio" },
  { id: "buscar", label: "Buscar" },
  { id: "ofrecer", label: "Ofrecer Viaje" },
  { id: "mensajes", label: "Mensajes" },
  { id: "en-curso", label: "En Curso" },
];

const viajesDestacados = [
  { hora: "7:00", dia: "Hoy", ruta: "Campus Sur → Centro", cupos: 3 },
  { hora: "8:15", dia: "Hoy", ruta: "Campus Norte → Centro", cupos: 2 },
  { hora: "9:00", dia: "Hoy", ruta: "Campus Sur → Este", cupos: 4 },
  { hora: "6:45", dia: "Mañana", ruta: "Norte → Campus Sur", cupos: 1 },
];

const proximosViajes = [
  { ruta: "Campus Norte → Centro", horario: "Mañana 8:00 AM" },
  { ruta: "Campus Norte → Centro", horario: "Mañana 9:00 AM" },
];

const feedNotificaciones = [
  { icono: "📅", texto: "Cita agendada", detalle: "Camila Angel" },
  { icono: "✉️", texto: "Mensaje recibido", detalle: "Yefersonpazo" },
  { icono: "🔔", texto: "Nuevo viaje publicado", detalle: "Sistema" },
];

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

export default function MenuPrincipal({ usuarioId }) {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);
  const [mensajePasajero, setMensajePasajero] = useState("");

  function irAVista(id) {
    setVistaActiva(id);
    if (id === "buscar") setViajeSeleccionado(null);
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
  }

  return (
    <div className="app-shell">
      {/* Cabezal: marca · navegación · usuario */}
      <header className="topbar">
        <div className="brand-logo">
          <h2>Cozymov</h2>
        </div>

        <nav className="topbar-nav">
          <ul className="nav">
            {enlacesMenu.map((enlace) => (
              <li className="nav-item" key={enlace.id}>
                <a
                  className={"nav-link" + (vistaActiva === enlace.id ? " active" : "")}
                  href="#"
                  onClick={(evento) => {
                    evento.preventDefault();
                    irAVista(enlace.id);
                  }}
                >
                  {enlace.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Perfil del usuario y configuración */}
        <div className="topbar-user">
          <div className="user-avatar">A</div>

          <div className="dropdown">
            <button
              className="btn btn-link text-white p-0 fs-5 text-decoration-none shadow-none"
              type="button"
              id="dropdownConfig"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Configuración"
            >
              <Image src="/icons/tuerca.png" alt="Configuración" width={20} height={20} />
            </button>
            <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" aria-labelledby="dropdownConfig">
              <li>
                <a
                  className="dropdown-item text-danger fw-semibold d-flex align-items-center gap-2"
                  href="#"
                  onClick={(evento) => {
                    evento.preventDefault();
                    // TODO: conectar con la lógica real de cierre de sesión
                  }}
                >
                  <Image src="/icons/puerta.png" alt="Cerrar sesión" width={20} height={20} /> Cerrar sesión
                </a>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main className="main-content flex-grow-1 p-4">
        <div className="border rounded-3 p-4 bloque_contenido" style={{ minHeight: 400 }}>

          {vistaActiva === "inicio" && (
            <div className="vista">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <h3 className="mb-0 letra-contenido">Tu Panel de Control</h3>

                <div className="d-flex flex-wrap gap-2">
                  <div className="input-group" style={{ width: 200 }}>
                    <span className="input-group-text">🔍</span>
                    <input type="text" className="form-control" placeholder="Origen..." />
                  </div>

                  <div className="input-group" style={{ width: 170 }}>
                    <span className="input-group-text">📅</span>
                    <input type="date" className="form-control" />
                  </div>

                  <button type="button" className="btn btn-primary" onClick={() => irAVista("ofrecer")}>
                    + Ofrecer viaje
                  </button>
                </div>
              </div>

              <div className="row g-4">
                {/* Columna izquierda: viajes para ti */}
                <div className="col-md-8">
                  <h5 className="mb-3 letra-contenido fw-bold">Viajes para ti</h5>
                  <div className="d-flex flex-column gap-3">
                    {viajesDestacados.map((viaje, indice) => (
                      <div className="viaje-item" key={indice}>
                        <div className="viaje-hora">
                          <span className="viaje-hora-valor">{viaje.hora}</span>
                          <small className="texto-secundario">{viaje.dia}</small>
                        </div>

                        <div className="viaje-info">
                          <div className="fw-semibold letra-contenido">{viaje.ruta}</div>
                          <span className={"viaje-cupos" + (viaje.cupos === 1 ? " viaje-cupos-ultimo" : "")}>
                            {viaje.cupos === 1 ? "Última plaza" : viaje.cupos + " plazas libres"}
                          </span>
                        </div>

                        <button type="button" className="btn-reservar">Reservar</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Columna derecha: próximo viaje + actividad reciente */}
                <div className="col-md-4">
                  <div className="panel-lateral mb-4">
                    <h5 className="letra-contenido fw-bold mb-3">Tu próximo viaje</h5>

                    <div className="proximo-destacado">
                      <small className="proximo-dia">{proximosViajes[0].horario}</small>
                      <div className="fw-bold letra-contenido">{proximosViajes[0].ruta}</div>
                    </div>

                    <div className="d-flex justify-content-between align-items-end gap-2 mt-3">
                      <small className="texto-secundario">
                        Después: {proximosViajes[1].horario}
                        <br />
                        {proximosViajes[1].ruta}
                      </small>
                      <a
                        className="ver-todos"
                        href="#"
                        onClick={(evento) => {
                          evento.preventDefault();
                          // TODO: conectar con la lista completa de próximos viajes
                        }}
                      >
                        Ver todos
                      </a>
                    </div>
                  </div>

                  <h5 className="mb-3 letra-contenido fw-bold">Actividad reciente</h5>
                  <div className="d-flex flex-column gap-2">
                    {feedNotificaciones.map((item, indice) => (
                      <div className="actividad-item" key={indice}>
                        <span className="actividad-icono">{item.icono}</span>
                        <div>
                          <div className="fw-semibold letra-contenido small">{item.texto}</div>
                          <small className="texto-secundario">{item.detalle}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {vistaActiva === "buscar" && (
            <div className="vista">
              {viajeSeleccionado === null ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <h3 className="mb-0 letra-contenido">Buscar Viaje</h3>

                    <div className="d-flex flex-wrap gap-2">
                      <div className="input-group" style={{ width: 150 }}>
                        <span className="input-group-text">📍</span>
                        <input type="text" className="form-control" defaultValue="Norte" />
                      </div>
                      <div className="input-group" style={{ width: 160 }}>
                        <span className="input-group-text">🏁</span>
                        <input type="text" className="form-control" defaultValue="Campus Sur" />
                      </div>
                      <div className="input-group" style={{ width: 150 }}>
                        <span className="input-group-text">📅</span>
                        <input type="date" className="form-control" />
                      </div>
                      <button type="button" className="btn btn-primary">Buscar</button>
                    </div>
                  </div>

                  <p className="texto-secundario fw-semibold mb-3">{resultadosViajes.length} resultados encontrados</p>

                  <div className="d-flex flex-column gap-3">
                    {resultadosViajes.map((viaje, indice) => (
                      <div
                        className="card p-3 color-card"
                        style={{ cursor: "pointer" }}
                        key={indice}
                        onClick={() => setViajeSeleccionado(viaje)}
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
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn btn-link texto-secundario ps-0 mb-3"
                    onClick={() => setViajeSeleccionado(null)}
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

                        <button type="button" className="btn btn-primary w-100">Solicitar unirme</button>
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
          )}

          {vistaActiva === "ofrecer" && (
            <OfrecerViajes
              pasajeroSeleccionado={pasajeroSeleccionado}
              setPasajeroSeleccionado={setPasajeroSeleccionado}
              mensajeAccion={mensajePasajero}
              setMensajeAccion={setMensajePasajero}
            />
          )}

          {vistaActiva === "mensajes" && (
            <div className="vista">
              <MensajesView usuarioActualId={usuarioId} receptorId="receptor_ejemplo" />
            </div>
          )}
          {vistaActiva === "en-curso" && <div className="vista"></div>}
        </div>
      </main>
    </div>
  );
}