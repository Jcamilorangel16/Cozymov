// Presenta el cabezal de navegación y el acceso a la configuración del perfil.
import { useEffect, useId, useState } from "react";
import PerfilConfiguracion from "../../perfil-configuracion/components/PerfilConfiguracion";
import { enlacesMenu } from "../constants/menuPrincipal";
import Swal from "sweetalert2";


/**
 * Renderiza los enlaces de navegación del menú.
 * @param {{vistaActiva: string, onNavigate: (id: string) => void, solicitudesPendientes?: number}} props Estado, acción de navegación y solicitudes de viaje por atender.
 * @returns Cabezal de navegación principal.
 */
export default function SidebarMenu({ vistaActiva, onNavigate, solicitudesPendientes = 0 }) {
  const [abierto, setAbierto] = useState(false);
  const idNavegacion = useId();

  // Escape cierra el menú desplegable en móvil.
  useEffect(() => {
    if (!abierto) return;
    const alTeclear = (evento) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  async function manejarNavegacion(evento, idVista) {
    evento.preventDefault();
    setAbierto(false);

    if (idVista !== "ofrecer") {
      onNavigate(idVista);
      return;
    }

    let resultado;
    try {
      const respuesta = await fetch("/api/vehiculo", { cache: "no-store" });
      resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo verificar tu vehículo.");
      }
      if (
        typeof resultado !== "object" ||
        resultado === null ||
        Array.isArray(resultado) ||
        !("vehiculo" in resultado)
      ) {
        throw new Error("La respuesta del servidor no contiene el vehículo esperado.");
      }
    } catch (error) {
      console.error("No se pudo verificar el vehículo antes de ofrecer un viaje:", error);
      await Swal.fire({
        icon: "error",
        title: "No se pudo verificar tu vehículo",
        text: error.message || "Inténtalo de nuevo más tarde.",
      });
      return;
    }

    if (resultado.vehiculo) {
      onNavigate("ofrecer");
      return;
    }

    const confirmacion = await Swal.fire({
      title: "¿Estás seguro de que quieres ofrecer un viaje?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "No",
      reverseButtons: false,
    });

    onNavigate(confirmacion.isConfirmed ? "ofrecer" : "inicio");
  }

  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-toggle"
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={abierto}
        aria-controls={idNavegacion}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <i className={`bi ${abierto ? "bi-x-lg" : "bi-list"}`} aria-hidden="true" />
      </button>

      <div className="brand-logo">
        <h2>
          <i className="bi bi-geo-alt-fill logo-icono" aria-hidden="true" />
          Cozymov
        </h2>
      </div>

      <nav
        id={idNavegacion}
        className={"topbar-nav" + (abierto ? " abierto" : "")}
        aria-label="Navegación principal"
      >
        <ul className="nav">
          {enlacesMenu.map((enlace) => (
            <li className="nav-item" key={enlace.id}>
              <a
                className={"nav-link" + (vistaActiva === enlace.id ? " active" : "")}
                href="#"
                aria-current={vistaActiva === enlace.id ? "page" : undefined}
                onClick={(evento) => manejarNavegacion(evento, enlace.id)}
              >
                <i className={`bi ${enlace.icono} nav-icono`} aria-hidden="true" />
                {enlace.label}
                {enlace.id === "buscar" && solicitudesPendientes > 0 && vistaActiva !== "buscar" && (
                  <span className="badge rounded-pill text-bg-success ms-1">
                    {solicitudesPendientes}
                    <span className="visually-hidden"> solicitudes de viaje pendientes</span>
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <PerfilConfiguracion onConfiguracion={() => onNavigate("configuracion")} />
    </header>
  );
}
