// Renderiza el acceso visual a la configuración del perfil y cierre de sesión.
import Image from "next/image";

/**
 * Presenta el avatar y las acciones de configuración de cuenta.
 * @returns Control visual de perfil para la barra lateral.
 */
export default function PerfilConfiguracion() {
  return (
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
          <Image src="/tuerca.png" alt="Configuración" width={20} height={20} />
        </button>
        <ul className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow" aria-labelledby="dropdownConfig">
          <li>
            <a
              className="dropdown-item text-danger fw-semibold d-flex align-items-center gap-2"
              href="#"
              onClick={(evento) => evento.preventDefault()}
            >
              <Image src="/puerta.png" alt="Cerrar sesión" width={20} height={20} /> Cerrar sesión
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
