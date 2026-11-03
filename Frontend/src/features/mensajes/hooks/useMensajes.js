// Gestiona la conversación activa, el historial y el envío de mensajes.
"use client";

import { useEffect, useState } from "react";
import { CONTACTOS_DE_PRUEBA } from "../constants/contactos";

/**
 * Gestiona la selección de contacto y el intercambio de mensajes.
 * @param {string} usuarioActualId Identificador del usuario activo.
 * @returns Contactos, conversación actual y acción de envío.
 */
export function useMensajes(usuarioActualId) {
  // Contacto activo y mensajes cargados para su conversación.
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);

  useEffect(() => {
    if (!contactoSeleccionado) return;

    /**
     * Obtiene del servidor la conversación con el contacto activo.
     * @returns {Promise<void>}
     */
    async function cargarMensajes() {
      try {
        const res = await fetch(
          `/api/mensajes?usuario1=${usuarioActualId}&usuario2=${contactoSeleccionado.id}`,
        );
        if (res.ok) {
          const data = await res.json();
          setMensajes(data);
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error);
      }
    }

    void cargarMensajes();
    const intervalo = setInterval(cargarMensajes, 4000);
    return () => clearInterval(intervalo);
  }, [contactoSeleccionado, usuarioActualId]);

  /**
   * Envía un mensaje al contacto seleccionado y agrega la respuesta al historial.
   * @param {string} contenidoTexto Texto escrito por el usuario.
   * @returns {Promise<void>}
   */
  async function manejarEnvio(contenidoTexto) {
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
  }

  /**
   * Cierra la conversación y limpia el historial mostrado.
   * @returns {void}
   */
  function volverAContactos() {
    setContactoSeleccionado(null);
    setMensajes([]);
  }

  return {
    contactos: CONTACTOS_DE_PRUEBA,
    contactoSeleccionado,
    setContactoSeleccionado,
    mensajes,
    manejarEnvio,
    volverAContactos,
  };
}
