// Presenta el cabezal de navegación y el acceso a la configuración del perfil.
import PerfilConfiguracion from "../../perfil-configuracion/components/PerfilConfiguracion";
import { enlacesMenu } from "../constants/menuPrincipal";
import Swal from "sweetalert2";


/**
 * Renderiza los enlaces de navegación del menú.
 * @param {{vistaActiva: string, onNavigate: (id: string) => void}} props Estado y acción de navegación.
 * @returns Cabezal de navegación principal.
 */
export default function SidebarMenu({ vistaActiva, onNavigate }) {
  async function manejarNavegacion(evento, idVista) {
    evento.preventDefault();

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
      <div className="brand-logo">
        <h2>
          <i className="bi bi-geo-alt-fill logo-icono" aria-hidden="true" />
          Cozymov
        </h2>
      </div>

      <nav className="topbar-nav" aria-label="Navegación principal">
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
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <PerfilConfiguracion onConfiguracion={() => onNavigate("configuracion")} />
    </header>
  );
}
