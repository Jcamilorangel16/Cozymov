"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import MensajesView from "../../mensajes/MensajesView";
import "./menu-principal.css";
import BuscarViajes from "../../buscar-viajes/components/BuscarViajes";

// Datos de ejemplo mantenidos al integrar los cambios del menú principal.
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export default function MenuPrincipal() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);
  const [mensajePasajero, setMensajePasajero] = useState("");

  function irAVista(id) {
    setVistaActiva(id);
    if (id === "buscar") {
      setViajeSeleccionado(null);
      setMensajeBusqueda("");
    }
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
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
          style={{ backgroundColor: "rgba(0, 70, 132, 0.87)" }}
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
              {/* Cambio de main: usar next/image y rutas públicas absolutas para los iconos. */}
              <Image src="/tuerca.png" alt="Configuración" width={20} height={20} />
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
                  {/* Cambio de main: optimizar también el icono de cierre con next/image. */}
                  <Image src="/puerta.png" alt="Cerrar sesión" width={20} height={20} /> Cerrar sesión
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

                  <button type="button" className="btn btn-primary" onClick={() => irAVista("ofrecer")}>
                    + Ofrecer viaje
                  </button>
                </div>
              </div>

              <div className="row g-4">
                {/* Columna izquierda: viajes destacados */}
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

                {/* Columna derecha: próximos viajes + notificaciones */}
                <div className="col-md-4">
                  <h5 className="mb-3 letra-contenido">Próximos viajes</h5>
                  <div className="d-flex flex-column gap-2 mb-4">
                    {proximosViajes.map((viaje, indice) => (
                      <div className="card p-2 color-card" key={indice}>
                        <div className="fw-semibold letra-contenido">{viaje.ruta}</div>
                        <small className="texto-secundario">{viaje.horario}</small>
                      </div>
                    ))}
                  </div>

                  {/* Cambio de main: mantener el feed dentro de la columna derecha para respetar la cuadrícula. */}
                  <h5 className="mb-3 letra-contenido">Feed de notificaciones y actividad</h5>
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
            </div>
          )}

          {vistaActiva === "buscar" && (
            <div className="vista">
              <BuscarViajes
                viajeSeleccionado={viajeSeleccionado}
                setViajeSeleccionado={setViajeSeleccionado}
                mensajeAccion={mensajeBusqueda}
                setMensajeAccion={setMensajeBusqueda}
              />
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
              <MensajesView usuarioActualId="usuario_actual" receptorId="receptor_ejemplo" />
            </div>
          )}
          {vistaActiva === "en-curso" && <div className="vista"></div>}
        </div>
      </main>
    </>
  );
}
