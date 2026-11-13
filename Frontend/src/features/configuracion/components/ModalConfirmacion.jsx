// Modal accesible de confirmación para acciones destructivas.
"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Presenta un diálogo modal con foco contenido y cierre con Escape.
 * @param {{abierto: boolean, titulo: string, descripcion: string, textoConfirmar?: string, onConfirmar: Function, onCancelar: Function}} props Configuración del modal.
 * @returns {JSX.Element|null} Diálogo visible o null cuando está cerrado.
 */
export default function ModalConfirmacion({
  abierto,
  titulo,
  descripcion,
  textoConfirmar = "Confirmar",
  onConfirmar,
  onCancelar,
}) {
  const tituloId = useId();
  const descripcionId = useId();
  const dialogo = useRef(null);
  const cancelarRef = useRef(onCancelar);
  const confirmarRef = useRef(onConfirmar);

  useEffect(() => {
    cancelarRef.current = onCancelar;
    confirmarRef.current = onConfirmar;
  }, [onCancelar, onConfirmar]);

  useEffect(() => {
    if (!abierto) return undefined;

    const focoAnterior = document.activeElement;
    const contenedor = dialogo.current;
    const obtenerEnfocables = () =>
      Array.from(
        contenedor?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((elemento) => !elemento.disabled);

    contenedor?.querySelector("[data-cancelar]")?.focus();

    const manejarTecla = (evento) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cancelarRef.current?.();
        return;
      }
      if (evento.key !== "Tab") return;

      const enfocables = obtenerEnfocables();
      if (enfocables.length === 0) return;

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener("keydown", manejarTecla);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", manejarTecla);
      document.body.style.overflow = overflowAnterior;
      if (focoAnterior instanceof HTMLElement) focoAnterior.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="config-modal-fondo"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) cancelarRef.current?.();
      }}
    >
      <div
        ref={dialogo}
        className="config-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descripcionId}
      >
        <h6 id={tituloId} className="config-modal-titulo">
          {titulo}
        </h6>
        <p id={descripcionId} className="config-ayuda">
          {descripcion}
        </p>
        <div className="config-modal-acciones">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => cancelarRef.current?.()}
            data-cancelar
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => confirmarRef.current?.()}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
