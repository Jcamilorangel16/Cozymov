"use client";

// Renderiza el avatar del perfil con acceso a configuración y cierre de sesión.
import Image from "next/image";
import { useRouter } from "next/navigation";

/**
 * Presenta el avatar como disparador del menú de cuenta.
 * @param {{onConfiguracion?: () => void}} props Acción para abrir la configuración general.
 * @returns Control visual de perfil para el cabezal.
 */
export default function PerfilConfiguracion({ onConfiguracion }) {
  const router = useRouter();

  const cerrarSesion = async (evento) => {
    evento.preventDefault();
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  };

  return (
    <div className="dropdown">
      <button
        className="user-avatar user-avatar-btn border-0"
        type="button"
        id="dropdownPerfil"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        aria-label="Abrir menú de perfil"
        title="Mi perfil"
      >
        A
      </button>

      <ul
        className="dropdown-menu dropdown-menu-dark dropdown-menu-end shadow"
        aria-labelledby="dropdownPerfil"
      >
        <li>
          <a
            className="dropdown-item fw-semibold d-flex align-items-center gap-2"
            href="#"
            onClick={(evento) => {
              evento.preventDefault();
              onConfiguracion?.();
            }}
          >
            <span aria-hidden="true">⚙️</span> Configuración general
          </a>
        </li>
        <li>
          <hr className="dropdown-divider" />
        </li>
        <li>
          <a
            className="dropdown-item text-danger fw-semibold d-flex align-items-center gap-2"
            href="#"
            onClick={cerrarSesion}
          >
            <Image src="/puerta.png" alt="" width={20} height={20} /> Cerrar sesión
          </a>
        </li>
      </ul>
    </div>
  );
}