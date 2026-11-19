"use client";

// Aviso verde que informa al conductor de una solicitud de viaje nueva.
import { useEffect } from "react";

/** Tiempo que permanece visible antes de ocultarse solo. */
const DURACION_MS = 15_000;

/**
 * Muestra el aviso en la esquina superior derecha.
 * @param {{aviso: {titulo: string, texto: string}|null, onVer: () => void, onCerrar: () => void, etiquetaVer?: string, desplazado?: boolean}} props Aviso, acciones, texto del botón y si se baja para no tapar otro aviso.
 * @returns Aviso o `null` si no hay ninguno.
 */
export default function AvisoSolicitudes({
  aviso,
  onVer,
  onCerrar,
  etiquetaVer = "Ver solicitudes",
  desplazado = false,
}) {
  useEffect(() => {
    if (!aviso) return undefined;
    const temporizador = setTimeout(onCerrar, DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [aviso, onCerrar]);

  if (!aviso) return null;

  return (
    <div
      className="toast-container position-fixed top-0 end-0 p-3"
      style={{ zIndex: 1090, ...(desplazado ? { marginTop: 150 } : {}) }}
    >
      <div className="toast show border-success border-2" role="status" aria-live="polite">
        <div className="toast-header bg-success text-white">
          <strong className="me-auto">{aviso.titulo}</strong>
          <button
            type="button"
            className="btn-close btn-close-white"
            aria-label="Cerrar aviso"
            onClick={onCerrar}
          />
        </div>
        <div className="toast-body bg-success-subtle">
          <p className="mb-2">{aviso.texto}</p>
          <button type="button" className="btn btn-success btn-sm" onClick={onVer}>
            {etiquetaVer}
          </button>
        </div>
      </div>
    </div>
  );
}
