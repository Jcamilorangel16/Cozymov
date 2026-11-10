// Presenta la lista de chats, el buscador de usuarios o la conversación activa.
"use client";

import ListaMensajes from "./ListaMensajes";
import FormularioMensaje from "./FormularioMensaje";
import { useMensajes } from "../hooks/useMensajes";

/**
 * Muestra los chats del usuario, el buscador de usuarios o la conversación abierta.
 * @param {{usuarioActualId: string}} props Identidad del usuario de la sesión.
 * @returns Vista de mensajería.
 */
export default function MensajesView({ usuarioActualId }) {
  const {
    vista,
    setVista,
    chats,
    contactos,
    busqueda,
    setBusqueda,
    contactoSeleccionado,
    abrirChat,
    mensajes,
    manejarEnvio,
    volverALista,
    error,
  } = useMensajes(usuarioActualId);

  if (contactoSeleccionado) {
    return (
      <div className="card p-3 color-card border-0">
        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={volverALista}
          >
            ← Volver
          </button>
          <h5 className="mb-0 letra-contenido fw-bold">
            Chat con {contactoSeleccionado.nombre}
          </h5>
          <div style={{ width: "80px" }}></div>
        </div>

        <ListaMensajes mensajes={mensajes} usuarioActualId={usuarioActualId} />
        <FormularioMensaje onEnviarMensaje={manejarEnvio} />
        {error && <p className="text-danger mt-2 mb-0">{error}</p>}
      </div>
    );
  }

  if (vista === "nuevo") {
    return (
      <div className="card p-3 color-card border-0">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="letra-contenido mb-0">Nuevo chat</h4>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            onClick={() => setVista("chats")}
          >
            ← Volver
          </button>
        </div>

        <input
          type="text"
          className="form-control mb-3"
          placeholder="Buscar usuario por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {error && <p className="text-danger">{error}</p>}

        <div className="list-group">
          {contactos.length === 0 && (
            <p className="text-muted">No se encontraron usuarios.</p>
          )}
          {contactos.map((c) => (
            <button
              key={c.id}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 rounded shadow-sm border"
              onClick={() => abrirChat(c)}
            >
              <div>
                <h5 className="mb-1 fw-bold text-dark">{c.nombre}</h5>
                <small className="text-muted">{c.rol}</small>
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="letra-contenido mb-0">Mensajes y Conversaciones</h4>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => setVista("nuevo")}
        >
          + Nuevo chat
        </button>
      </div>

      {error && <p className="text-danger">{error}</p>}

      {chats.length === 0 ? (
        <p className="text-muted mb-0">Aún no tienes conversaciones.</p>
      ) : (
        <div className="list-group">
          {chats.map((c) => (
            <button
              key={c.id}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center p-3 mb-2 rounded shadow-sm border"
              onClick={() => abrirChat(c)}
            >
              <div>
                <h5 className="mb-1 fw-bold text-dark">{c.nombre}</h5>
                <small className="text-muted">{c.ultimoMensaje}</small>
              </div>
              {c.noLeidos > 0 && (
                <span className="badge bg-danger rounded-pill">{c.noLeidos}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
