// Marca visual compartida de Cozymov: isotipo y logotipo.
import "./Logo.css";

/**
 * Renderiza el isotipo de Cozymov como un SVG escalable.
 * La "C" representa la ruta y el punto superior el destino del viaje.
 * @param {{className?: string}} props Clases adicionales para el SVG.
 * @returns Isotipo decorativo de la marca.
 */
export function LogoMark({ className = "" }) {
  return (
    <svg
      className={`cozymov-logo-mark ${className}`.trim()}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <path
        d="M22 9.5a9 9 0 1 0 0 13"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="22" cy="9.5" r="2.7" fill="#fff" />
      <circle cx="22" cy="9.5" r="0.95" fill="currentColor" />
    </svg>
  );
}

/**
 * Compone el isotipo con el nombre de la plataforma y una leyenda opcional.
 * @param {{caption?: string, className?: string}} props Leyenda y clases extra.
 * @returns Logotipo completo de Cozymov.
 */
export default function Logo({ caption, className = "" }) {
  return (
    <span className={`cozymov-logo ${className}`.trim()}>
      <LogoMark />
      <span className="cozymov-logo-text">
        <span className="cozymov-logo-name">Cozymov</span>
        {caption ? <span className="cozymov-logo-caption">{caption}</span> : null}
      </span>
    </span>
  );
}
