// Botón reutilizable con icono de ojo para mostrar u ocultar una contraseña.
import "./BotonVerContrasena.css";

/**
 * Alterna la visibilidad de un campo de contraseña.
 * @param {object} props Estado visible, acción y campo que controla.
 * @returns Botón accesible con icono de ojo.
 */
export default function BotonVerContrasena({ visible, onAlternar, controla, disabled }) {
  return (
    <button
      type="button"
      className="btn boton-ver-contrasena"
      onClick={onAlternar}
      aria-controls={controla}
      aria-pressed={visible}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      disabled={disabled}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
        {visible ? <path d="M3 3l18 18" /> : null}
      </svg>
    </button>
  );
}
