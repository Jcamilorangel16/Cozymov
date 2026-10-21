// Presenta el selector de contactos o la conversación que administra el hook.
"use client";

import ListaMensajes from "./ListaMensajes";
import FormularioMensaje from "./FormularioMensaje";
import { useMensajes } from "../hooks/useMensajes";

/**
 * Muestra la lista de contactos o la conversación del contacto seleccionado.
 * @param {{usuarioActualId?: string}} props Identidad del usuario activo.
 * @returns Vista de mensajería.
 */
export default function MensajesView({ usuarioActualId = "1" }) {
  const {
    contactos,
    contactoSeleccionado,
    setContactoSeleccionado,
    mensajes,
    manejarEnvio,
    volverAContactos,
  } = useMensajes(usuarioActualId);

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
          onClick={volverAContactos}
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
