export default function PerfilConfiguracion() {
  return (
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
              onClick={(evento) => evento.preventDefault()}
            >
              🚪 Cerrar sesión
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
