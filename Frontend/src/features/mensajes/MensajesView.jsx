"use client";
import { useState, useEffect } from "react";
import ListaMensajes from "./components/ListaMensajes";
import FormularioMensaje from "./components/FormularioMensaje";

export default function MensajesView({ usuarioActualId = "1" }) {
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);

  // Contactos de prueba (luego los puedes cargar dinámicamente desde la BD)
  const contactos = [
    { id: "2", nombre: "Carlos Monteno", rol: "Conductor" },
    { id: "3", nombre: "Sara Tomato", rol: "Pasajera" },
  ];

  // Cargar mensajes al seleccionar un contacto
  useEffect(() => {
    if (!contactoSeleccionado) return;

    async function cargarMensajes() {
      try {
        const res = await fetch(
          `/api/mensajes?usuario1=${usuarioActualId}&usuario2=${contactoSeleccionado.id}`
        );
        if (res.ok) {
          const data = await res.json();
          setMensajes(data);
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
      }
    }

    cargarMensajes();
    const intervalo = setInterval(cargarMensajes, 4000); // Polling cada 4s
    return () => clearInterval(intervalo);
  }, [contactoSeleccionado, usuarioActualId]);

  // Manejar envío de mensaje
  const manejarEnvio = async (contenidoTexto) => {
    try {
      const res = await fetch("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_emisor: usuarioActualId,
          id_receptor: contactoSeleccionado.id,
          contenido: contenidoTexto,
        }),
      });

      if (res.ok) {
        const nuevoMensajeGuardado = await res.json();
        setMensajes((prev) => [...prev, nuevoMensajeGuardado]);
      }
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
    }
  };

  
  if (!contactoSeleccionado) {
    return (
      <div className="card p-3 color-card border-0">
        <h4 className="letra-contenido mb-3">Mensajes y Conversaciones</h4>
        
        <div className="list-group">
          {contactos.map((contacto) => (
            <button
              key={contacto.id}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 rounded shadow-sm border"
              onClick={() => setContactoSeleccionado(contacto)}
            >
              <div>
                <h5 className="mb-1 fw-bold text-dark">{contacto.nombre}</h5>
                <small className="text-muted">{contacto.rol}</small>
              </div>
              <span className="badge bg-primary rounded-pill">Abrir chat ›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

 
  return (
    <div className="card p-3 color-card border-0">
      <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => {
            setContactoSeleccionado(null);
            setMensajes([]);
          }}
        >
          ← Volver a contactos
        </button>
        <h5 className="mb-0 letra-contenido fw-bold">
          Chat con {contactoSeleccionado.nombre}
        </h5>
        <div style={{ width: "80px" }}></div>
      </div>

      <ListaMensajes mensajes={mensajes} usuarioActualId={usuarioActualId} />
      <FormularioMensaje onEnviarMensaje={manejarEnvio} />
    </div>
  );
}