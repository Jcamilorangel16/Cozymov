"use client";
import { useState } from "react";

export default function FormularioMensaje({ onEnviarMensaje }) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;

    setEnviando(true);
    await onEnviarMensaje(texto);
    setTexto("");
    setEnviando(false);
  };

  return (
    <form onSubmit={handleSubmit} className="d-flex gap-2 mt-3">
      <input
        type="text"
        className="form-control"
        placeholder="Escribe un mensaje (máx 500 caracteres)..."
        maxLength={500}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        disabled={enviando}
      />
      <button 
        type="submit" 
        className="btn btn-primary px-4"
        disabled={!texto.trim() || enviando}
      >
        {enviando ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}