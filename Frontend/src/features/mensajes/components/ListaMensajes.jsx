// Muestra los mensajes de la conversación y desplaza la vista al último.
"use client";
import { useEffect, useRef } from "react";
import { horaLocalMensaje } from "../utils/horaMensaje";

/**
 * Renderiza los mensajes alineados según quién los envió.
 * @param {{mensajes: Array, usuarioActualId: string, nombreContacto?: string}} props Datos de la conversación.
 * @returns Lista visual de mensajes.
 */
export default function ListaMensajes({ mensajes, usuarioActualId, nombreContacto = "" }) {
  const chatBottomRef = useRef(null);
  const inicial = nombreContacto.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  if (!mensajes || mensajes.length === 0) {
    return (
      <div className="msj-hilo">
        <div className="msj-vacio">
          <i className="bi bi-chat-heart" aria-hidden="true" />
          <strong>No hay mensajes aún</strong>
          <span>¡Saluda y coordina tu viaje!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="msj-hilo" role="log" aria-live="polite">
      {mensajes.map((msg) => {
        const esMio = String(msg.id_emisor) === String(usuarioActualId);

        return (
          <div
            key={msg.id_mensaje || msg.fecha_hora}
            className={`msj-fila ${esMio ? "msj-fila-mio" : ""}`}
          >
            {!esMio && (
              <span className="msj-avatar msj-avatar-chico" aria-hidden="true">
                {inicial}
              </span>
            )}
            <div className={`msj-burbuja ${esMio ? "msj-burbuja-mio" : "msj-burbuja-otro"}`}>
              <p>{msg.contenido}</p>
              <div className="msj-hora">
                {horaLocalMensaje(msg.fecha_hora) ||
                  (msg.fecha_hora ? "Hora no disponible" : "Enviando...")}
                {esMio && horaLocalMensaje(msg.fecha_hora) && (
                  <i className="bi bi-check2 ms-1" aria-hidden="true" />
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
