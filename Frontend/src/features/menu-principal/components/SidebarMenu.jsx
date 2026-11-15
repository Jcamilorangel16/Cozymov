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
        <h2>Cozymov</h2>
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
