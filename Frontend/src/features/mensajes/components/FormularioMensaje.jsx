// Renderiza el campo para redactar y enviar un mensaje.
"use client";

import { useFormularioMensaje } from "../hooks/useFormularioMensaje";

/**
 * Muestra el formulario de envío de mensajes.
 * @param {{onEnviarMensaje: (texto: string) => Promise<void>}} props Acción de envío.
 * @returns Formulario visual de mensajes.
 */
export default function FormularioMensaje({ onEnviarMensaje }) {
  const { texto, setTexto, enviando, handleSubmit, mensajeListo } =
    useFormularioMensaje(onEnviarMensaje);

  return (
    <form onSubmit={handleSubmit} className="d-flex gap-2 mt-3">
      <input
        type="text"
        className="form-control"
        placeholder="Escribe un mensaje ..."
        maxLength={500}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={enviando}
      />
      <button 
        type="submit" 
        className="btn btn-primary px-4"
        disabled={!mensajeListo}
      >
        {enviando ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}