import PerfilConfiguracion from "../../perfil-configuracion/components/PerfilConfiguracion";

const enlacesMenu = [
  { id: "inicio", label: "Inicio" },
  { id: "buscar", label: "Buscar" },
  { id: "ofrecer", label: "Ofrecer Viaje" },
  { id: "mensajes", label: "Mensajes" },
  { id: "en-curso", label: "En Curso" },
];

export default function SidebarMenu({ vistaActiva, onNavigate }) {
  return (
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
                aria-current={vistaActiva === enlace.id ? "page" : undefined}
                onClick={(evento) => {
                  evento.preventDefault();
                  onNavigate(enlace.id);
                }}
              >
                {enlace.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <PerfilConfiguracion />
    </aside>
  );
}
