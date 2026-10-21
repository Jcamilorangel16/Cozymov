"use client";
import { useState, useEffect } from "react";

export default function MensajesView({ usuarioActualId, receptorId }) {
  const [mensajes, setMensajes] = useState([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");

  // Cargar mensajes entre el usuario actual y el receptor
  useEffect(() => {
    if (!usuarioActualId || !receptorId) return;

    async function cargarMensajes() {
      try {
        const res = await fetch(`/api/mensajes?usuario1=${usuarioActualId}&usuario2=${receptorId}`);
        if (res.ok) {
          const data = await res.json();
          setMensajes(data);
        }
      } catch (error) {
        console.error("Error cargando mensajes:", error);
      }
    }

    cargarMensajes();
    const intervalo = setInterval(cargarMensajes, 5000); // Actualiza cada 5 segundos
    return () => clearInterval(intervalo);
  }, [usuarioActualId, receptorId]);

  // Enviar mensaje guardándolo en la base de datos
  async function enviarMensaje(e) {
    e.preventDefault();
    if (!nuevoMensaje.trim()) return;

    try {
      const res = await fetch("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_emisor: usuarioActualId,
          id_receptor: receptorId,
          contenido: nuevoMensaje,
        }),
      });

      if (res.ok) {
        const mensajeGuardado = await res.json();
        setMensajes((prev) => [...prev, mensajeGuardado]);
        setNuevoMensaje("");
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  }

  return (
    <div className="card p-3 color-card">
      <h4 className="letra-contenido mb-3">Chat</h4>
      
      <div className="chat-box mb-3 p-2 border rounded" style={{ height: "350px", overflowY: "auto" }}>
        {mensajes.map((msg) => {
          const esMio = msg.id_emisor === usuarioActualId;
          return (
            <div key={msg.id_mensaje} className={`mb-2 d-flex ${esMio ? "justify-content-end" : "justify-content-start"}`}>
              <div className={`p-2 rounded ${esMio ? "bg-primary text-white" : "bg-light text-dark"}`} style={{ maxWidth: "75%" }}>
                <p className="mb-1">{msg.contenido}</p>
                <small className={esMio ? "text-light opacity-75" : "text-muted"}>
                  {new Date(msg.fecha_hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={enviarMensaje} className="d-flex gap-2">
        <input
          type="text"
          className="form-control"
          placeholder="Escribe un mensaje..."
          maxLength={500}
          value={nuevoMensaje}
          onChange={(e) => setNuevoMensaje(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Enviar</button>
      </form>
    </div>
  );
}