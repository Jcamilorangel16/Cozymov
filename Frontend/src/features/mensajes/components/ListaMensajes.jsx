// Muestra los mensajes de la conversación y desplaza la vista al último.
"use client";
import { useEffect, useRef } from "react";

/**
 * Renderiza los mensajes alineados según quién los envió.
 * @param {{mensajes: Array, usuarioActualId: string}} props Datos de la conversación.
 * @returns Lista visual de mensajes.
 */
export default function ListaMensajes({ mensajes, usuarioActualId }) {
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  if (!mensajes || mensajes.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center p-5 text-muted bg-light rounded border">
        <p className="mb-0">No hay mensajes aún. ¡Inicia la conversación!</p>
      </div>
    );
  }

  return (
    <div 
      className="chat-container p-3 rounded border bg-light" 
      style={{ height: "350px", overflowY: "auto" }}
    >
      {mensajes.map((msg) => {
        const esMio = String(msg.id_emisor) === String(usuarioActualId);

        return (
          <div
            key={msg.id_mensaje || msg.fecha_hora}
            className={`d-flex mb-3 ${esMio ? "justify-content-end" : "justify-content-start"}`}
          >
            <div
              className={`p-3 rounded-3 shadow-sm ${
                esMio 
                  ? "bg-primary text-white ms-5" 
                  : "bg-white text-dark me-5 border"
              }`}
              style={{ maxWidth: "75%", wordBreak: "break-word" }}
            >
              <p className="mb-1 text-wrap">{msg.contenido}</p>
              
              <div 
                className={`text-end ${esMio ? "text-white-50" : "text-muted"}`} 
                style={{ fontSize: "0.75rem" }}
              >
                {msg.fecha_hora ? (
                  new Date(msg.fecha_hora).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                ) : (
                  "Enviando..."
                )}
              </div>
            </div>
          </div>
        );
      })}
      
      <div ref={chatBottomRef} />
    </div>
  );
}