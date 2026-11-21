// Presenta la lista de chats, el buscador de usuarios o la conversación activa.
"use client";

import ListaMensajes from "./ListaMensajes";
import FormularioMensaje from "./FormularioMensaje";
import { useMensajes } from "../hooks/useMensajes";
import "../styles/mensajes.css";

/**
 * Devuelve la inicial del nombre para el avatar.
 * @param {string} nombre Nombre del contacto.
 * @returns {string} Inicial en mayúscula.
 */
function inicialDe(nombre) {
  return String(nombre ?? "").trim().charAt(0).toUpperCase() || "?";
}

/**
 * Muestra los chats del usuario, el buscador de usuarios o la conversación abierta.
 * @param {{usuarioActualId: string, contactoInicial?: {id: string, nombre: string}|null, viajeOrigen?: {origen: string, destino: string}|null, onVolverAlViaje?: () => void}} props Identidad de sesión, contacto opcional y, si la conversación se abrió desde un viaje, su resumen y la acción para regresar a él.
 * @returns Vista de mensajería.
 */
export default function MensajesView({
  usuarioActualId,
  contactoInicial = null,
  viajeOrigen = null,
  onVolverAlViaje,
}) {
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
    reintentar,
    cargando,
    error,
  } = useMensajes(usuarioActualId, contactoInicial);

  if (contactoSeleccionado) {
    return (
      <div className="card msj-panel">
        <div className="msj-cabecera">
          <button type="button" className="btn btn-sm" onClick={volverALista}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Volver
          </button>
          <h5 className="d-flex align-items-center gap-2">
            <span className="msj-avatar msj-avatar-chico" aria-hidden="true">
              {inicialDe(contactoSeleccionado.nombre)}
            </span>
            {contactoSeleccionado.nombre}
          </h5>
          <span style={{ width: 80 }} aria-hidden="true" />
        </div>

        <div className="msj-cuerpo">
          {viajeOrigen && onVolverAlViaje && (
            <div className="msj-viaje-aviso">
              <span>
                <i className="bi bi-signpost-2-fill" aria-hidden="true" /> Consultas el viaje{" "}
                <strong>
                  {viajeOrigen.origen} → {viajeOrigen.destino}
                </strong>
                . Aún no está reservado.
              </span>
              <button type="button" className="btn btn-sm btn-primary" onClick={onVolverAlViaje}>
                <i className="bi bi-arrow-left-circle-fill" aria-hidden="true" /> Volver al viaje
              </button>
            </div>
          )}
          <ListaMensajes
            mensajes={mensajes}
            usuarioActualId={usuarioActualId}
            nombreContacto={contactoSeleccionado.nombre}
            cargando={cargando}
          />
          <FormularioMensaje onEnviarMensaje={manejarEnvio} />
          {error && (
            <p className="text-danger mt-2 mb-0" role="alert">
              {error}{" "}
              <button type="button" className="btn btn-link btn-sm p-0 align-baseline" onClick={() => void reintentar()}>
                Reintentar
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  if (vista === "nuevo") {
    return (
      <div className="card msj-panel">
        <div className="msj-cabecera">
          <h4 className="d-flex align-items-center gap-2">
            <i className="bi bi-person-plus-fill" aria-hidden="true" /> Nuevo chat
          </h4>
          <button type="button" className="btn btn-sm" onClick={() => setVista("chats")}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> Volver
          </button>
        </div>

        <div className="msj-cuerpo">
          <div className="msj-buscador">
            <i className="bi bi-search" aria-hidden="true" />
            <input
              type="text"
              className="form-control"
              placeholder="Buscar usuario por nombre..."
              aria-label="Buscar usuario por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {error && <p className="text-danger">{error}</p>}

          {contactos.length === 0 && (
            <div className="msj-vacio">
              <i className="bi bi-person-x" aria-hidden="true" />
              <span>No se encontraron usuarios.</span>
            </div>
          )}
          {contactos.map((c) => (
            <button key={c.id} type="button" className="msj-item" onClick={() => abrirChat(c)}>
              <span className="msj-avatar" aria-hidden="true">{inicialDe(c.nombre)}</span>
              <span className="msj-item-texto">
                <span className="msj-item-nombre">{c.nombre}</span>
                <span className="msj-item-sub">{c.rol}</span>
              </span>
              <span className="msj-chip-abrir">
                Abrir chat <i className="bi bi-chevron-right" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card msj-panel">
      <div className="msj-cabecera">
        <h4 className="d-flex align-items-center gap-2">
          <i className="bi bi-chat-heart-fill" aria-hidden="true" /> Mensajes
        </h4>
        <button type="button" className="btn btn-sm btn-nuevo" onClick={() => setVista("nuevo")}>
          <i className="bi bi-plus-circle-fill" aria-hidden="true" /> Nuevo chat
        </button>
      </div>

      <div className="msj-cuerpo">
        {error && <p className="text-danger">{error}</p>}

        {chats.length === 0 ? (
          <div className="msj-vacio">
            <i className="bi bi-chat-square-heart" aria-hidden="true" />
            <strong>Aún no tienes conversaciones</strong>
            <span>Pulsa «Nuevo chat» para escribirle a un compañero.</span>
          </div>
        ) : (
          chats.map((c) => (
            <button key={c.id} type="button" className="msj-item" onClick={() => abrirChat(c)}>
              <span className="msj-avatar" aria-hidden="true">{inicialDe(c.nombre)}</span>
              <span className="msj-item-texto">
                <span className="msj-item-nombre">{c.nombre}</span>
                <span className="msj-item-sub">{c.ultimoMensaje}</span>
              </span>
              {c.noLeidos > 0 && (
                <span className="msj-insignia" aria-label={`${c.noLeidos} sin leer`}>
                  {c.noLeidos}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
