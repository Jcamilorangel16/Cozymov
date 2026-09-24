"use client";

import { useState } from "react";
import "./menu-principal.css";

// --- Datos de ejemplo (antes escritos a mano en el HTML) ---

const enlacesMenu = [
  { id: "inicio", label: "Inicio" },
  { id: "buscar", label: "Buscar" },
  { id: "ofrecer", label: "Ofrecer Viaje" },
  { id: "mensajes", label: "Mensajes" },
  { id: "en-curso", label: "En Curso" },
];

const viajesDestacados = [
  { ruta: "Campus Sur → Centro", horario: "Hoy 7:00 AM · 3 plazas" },
  { ruta: "Norte → Campus Sur", horario: "Mañana 6:45 AM · 1 lugar" },
  { ruta: "Campus Norte → Centro", horario: "Hoy 8:15 AM · 2 plazas" },
  { ruta: "Campus Sur → Este", horario: "Hoy 9:00 AM · 4 lugares" },
];

const proximosViajes = [
  { ruta: "Campus Norte → Centro", horario: "Mañana 8:00 AM" },
  { ruta: "Campus Norte → Centro", horario: "Mañana 9:00 AM" },
];

const feedNotificaciones = [
  { icono: "📅", texto: "Cita agendada", detalle: "Camila Angel" },
  { icono: "✉️", texto: "Mensaje recibido", detalle: "Yefersonpazo" },
  { icono: "🔔", texto: "Nuevo viaje publicado", detalle: "system" },
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

const resultadosPasajeros = [
  {
    nombre: "Camila Castro", iniciales: "CC", avatarColor: "bg-success",
    rating: "4.8", viajes: "37", ruta: "Norte → Campus Sur",
    horario: "Hoy · 6:50 AM", punto: "Entrada Norte", personas: "2",
  },
  {
    nombre: "Luis Herrera", iniciales: "LH", avatarColor: "bg-warning",
    rating: "4.5", viajes: "12", ruta: "Norte → Campus Sur",
    horario: "Hoy · 7:10 AM", punto: "Entrada Norte", personas: "1",
  },
];

export default function MenuPrincipal() {
  // Reemplaza a mostrarVista(): en vez de tocar el DOM, guardamos la vista activa en estado.
  const [vistaActiva, setVistaActiva] = useState("inicio");

  // Reemplazan a los data-* + llenarDetalleViaje/llenarDetallePasajero:
  // si es null, se muestran los resultados; si tiene un objeto, se muestra el detalle.
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);

  function irAVista(id) {
    setVistaActiva(id);
    // Al reingresar a Buscar/Ofrecer, siempre se arranca en resultados, no en el detalle.
    if (id === "buscar") setViajeSeleccionado(null);
    if (id === "ofrecer") setPasajeroSeleccionado(null);
  }

  return (
    <>
      <aside className="sidebar">
        <div className="brand-logo">
          <h2>Cozymov</h2>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav flex-column">
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
        <div
          className="sidebar-user d-flex align-items-center justify-content-between p-2 rounded"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
        >
          <div className="d-flex align-items-center gap-2">
            <div className="user-avatar">A</div>
          </div>

          <div className="dropdown">
            <button
              className="btn btn-link text-white p-0 fs-5 text-decoration-none shadow-none"
              type="button"
              id="dropdownConfig"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="Configuración"
            >
              ⚙️
            </button>
            <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" aria-labelledby="dropdownConfig">
              <li>
                <a
                  className="dropdown-item text-danger fw-semibold"
                  href="#"
                  onClick={(evento) => {
                    evento.preventDefault();
                    // TODO: conectar con la lógica real de cierre de sesión
                  }}
                >
                  🚪 Cerrar sesión
                </a>
              </li>
            </ul>
          </div>
        </div>
      </aside>

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

                  <button type="button" className="btn btn-primary">+ Ofrecer viaje</button>
                </div>
              </div>

              <div className="row g-4">
                <div className="col-md-8">
                  <h5 className="mb-3 letra-contenido">Viajes destacados para ti</h5>
                  <div className="row g-3">
                    {viajesDestacados.map((viaje, indice) => (
                      <div className="col-md-6" key={indice}>
                        <div className="card p-2 color-card">
                          <div className="d-flex align-items-center gap-2">
                            <span className="fs-4">🚗</span>
                            <div>
                              <div className="fw-semibold">{viaje.ruta}</div>
                              <small className="text-muted">{viaje.horario}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-md-4">
                  <h5 className="mb-3 letra-contenido">Mis Próximos Viajes</h5>
                  <div className="d-flex flex-column gap-2">
                    {proximosViajes.map((viaje, indice) => (
                      <div className="card p-3 d-flex flex-row justify-content-between align-items-center color-card" key={indice}>
                        <div>
                          <div className="fw-semibold">{viaje.ruta}</div>
                          <small className="text-muted">{viaje.horario}</small>
                        </div>
                        <span className="badge bg-success">Agendado</span>
                      </div>
                    ))}
                  </div>
                </div>

                <h5 className="mt-4 mb-3 letra-contenido">Feed de notificaciones y actividad</h5>
                <div className="d-flex flex-column gap-2">
                  {feedNotificaciones.map((item, indice) => (
                    <div className="d-flex align-items-center gap-2" key={indice}>
                      <span className="fs-5">{item.icono}</span>
                      <div>
                        <span className="fw-semibold letra-contenido">{item.texto}</span>
                        <span className="texto-secundario"> · {item.detalle}</span>
                      </div>
                    </div>
                  ))}
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
            <div className="vista">
              {pasajeroSeleccionado === null ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
                    <h3 className="mb-0 letra-contenido">Encontrar Pasajeros</h3>

                    <div className="d-flex flex-wrap gap-2">
                      <div className="input-group" style={{ width: 220 }}>
                        <span className="input-group-text">◉ Punto</span>
                        <input type="text" className="form-control" placeholder="Norte" />
                      </div>
                      <div className="input-group" style={{ width: 220 }}>
                        <span className="input-group-text">◎ Destino</span>
                        <input type="text" className="form-control" placeholder="Campus Sur" />
                      </div>
                      <div className="input-group" style={{ width: 170 }}>
                        <span className="input-group-text"># Personas</span>
                        <input type="number" className="form-control" placeholder="2" min="1" />
                      </div>
                      <button type="button" className="btn btn-primary px-3">Buscar</button>
                    </div>
                  </div>

                  <p className="texto-secundario fw-semibold mb-3">{resultadosPasajeros.length} Posibles pasajeros</p>

                  <div className="row g-3">
                    {resultadosPasajeros.map((pasajero, indice) => (
                      <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={indice}>
                        <div
                          className="card p-3 color-card h-100"
                          style={{ cursor: "pointer" }}
                          onClick={() => setPasajeroSeleccionado(pasajero)}
                        >
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <div className={"user-avatar " + pasajero.avatarColor} style={{ width: 38, height: 38, fontSize: 13 }}>
                                {pasajero.iniciales}
                              </div>
                              <div>
                                <div className="fw-bold letra-contenido">{pasajero.nombre}</div>
                                <small className="texto-secundario">★ {pasajero.rating} · {pasajero.viajes} viajes</small>
                              </div>
                            </div>
                            <span className="fs-4 texto-secundario">›</span>
                          </div>

                          <div className="texto-secundario small mt-2">
                            <span>◉ Norte</span> → <span>◎ Campus Sur</span>
                          </div>

                          <div className="mt-2 d-flex justify-content-between align-items-center">
                            <span className="badge bg-primary">{pasajero.personas} persona(s)</span>
                            <small className="texto-secundario">{pasajero.horario}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    className="btn btn-link texto-secundario ps-0 mb-3"
                    onClick={() => setPasajeroSeleccionado(null)}
                  >
                    ‹ Volver a pasajeros
                  </button>

                  <div className="row g-3">
                    <div className="col-lg-5">
                      <div className="card p-3 color-card">
                        <h5 className="letra-contenido mb-0">{pasajeroSeleccionado.ruta}</h5>
                        <small className="texto-secundario d-block mb-3">{pasajeroSeleccionado.horario}</small>

                        <div className="d-flex align-items-center gap-2 mb-3">
                          <div className={"user-avatar " + pasajeroSeleccionado.avatarColor} style={{ width: 42, height: 42 }}>
                            {pasajeroSeleccionado.iniciales}
                          </div>
                          <div>
                            <div className="fw-semibold letra-contenido">{pasajeroSeleccionado.nombre}</div>
                            <small className="texto-secundario">★ {pasajeroSeleccionado.rating} · {pasajeroSeleccionado.viajes} viajes</small>
                          </div>
                        </div>

                        <small className="texto-secundario d-block">Punto de encuentro</small>
                        <p className="fw-semibold mb-2" style={{ color: "#a03c3c" }}>{pasajeroSeleccionado.punto}</p>

                        <small className="texto-secundario d-block">Personas que viajan</small>
                        <p className="fw-semibold mb-3" style={{ color: "#1457e7" }}>{pasajeroSeleccionado.personas} persona(s)</p>

                        <button type="button" className="btn btn-primary w-100">Aceptar Pasajero</button>
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

          {vistaActiva === "mensajes" && <div className="vista"></div>}

          {vistaActiva === "en-curso" && <div className="vista"></div>}

        </div>
      </main>
    </>
  );
}
