// Botón que inicia el flujo de Microsoft (cuenta institucional de Outlook).
import "./BotonGoogle.css";

/**
 * Enlace al flujo OAuth de Microsoft. Es navegación completa: la ruta redirige
 * a Microsoft, no es una página de Next.
 * @param {{texto: string, deshabilitado?: boolean}} props Texto y estado.
 * @returns Botón con el logotipo de Microsoft.
 */
export default function BotonMicrosoft({ texto, deshabilitado = false }) {
  return (
    <a
      href="/api/auth/microsoft"
      className={`btn btn-google${deshabilitado ? " disabled" : ""}`}
      aria-disabled={deshabilitado}
    >
      <svg viewBox="0 0 21 21" width="20" height="20" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
      {texto}
    </a>
  );
}
