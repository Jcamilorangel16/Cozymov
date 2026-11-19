// Avisa al usuario de los mensajes nuevos, esté en la sección que esté.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectarMensajesNuevos, resumirMensaje, textoAvisoMensajes } from "../utils/avisosMensajes";

/** Cada cuánto se consulta la lista de chats en busca de mensajes nuevos. */
const INTERVALO_MS = 10_000;

/** Máximo de notificaciones del navegador por consulta, para no inundar al usuario. */
const MAX_NOTIFICACIONES = 3;

/**
 * Consulta periódicamente los chats y, cuando llega un mensaje nuevo, muestra un aviso en la
 * aplicación y, si el usuario concedió el permiso, una notificación del navegador.
 * @param {string} idUsuario Usuario autenticado.
 * @param {{alAbrirChat: (contacto: {id: string, nombre: string}) => void, silenciar?: () => boolean}} opciones
 * `alAbrirChat` lleva al chat del remitente; `silenciar` devuelve true cuando no hace falta avisar
 * (por ejemplo, si el usuario ya está en Mensajes con la pestaña visible).
 * @returns {{aviso: {titulo: string, texto: string, contacto: {id: string, nombre: string}}|null, cerrarAviso: () => void}} Aviso visible y cómo cerrarlo.
 */
export function useAvisosMensajes(idUsuario, { alAbrirChat, silenciar }) {
  const [aviso, setAviso] = useState(null);
  const alAbrirRef = useRef(alAbrirChat);
  const silenciarRef = useRef(silenciar);

  useEffect(() => {
    alAbrirRef.current = alAbrirChat;
    silenciarRef.current = silenciar;
  });

  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    const { signal } = controlador;
    // Chats de la consulta anterior; null hasta la primera, que solo fija la referencia.
    let previos = null;

    function notificarNavegador(chat) {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const { titulo } = textoAvisoMensajes([chat]);
        const notificacion = new Notification(titulo, {
          body: resumirMensaje(chat.texto),
          tag: `cozymov-mensaje-${chat.id}`,
        });
        notificacion.onclick = () => {
          window.focus();
          alAbrirRef.current?.({ id: chat.id, nombre: chat.nombre });
          notificacion.close();
        };
      } catch {
        // Algunos navegadores móviles no permiten construir Notification directamente.
      }
    }

    async function consultar() {
      try {
        const respuesta = await fetch("/api/mensajes/chats", { cache: "no-store", signal });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (!Array.isArray(datos) || signal.aborted) return;

        const nuevos = detectarMensajesNuevos(previos, datos);
        previos = datos;
        if (nuevos.length === 0 || silenciarRef.current?.()) return;

        const { titulo, texto } = textoAvisoMensajes(nuevos);
        const { id, nombre } = nuevos[0];
        setAviso({ titulo, texto, contacto: { id, nombre } });
        nuevos.slice(0, MAX_NOTIFICACIONES).forEach(notificarNavegador);
      } catch {
        // Un fallo de red no debe molestar al usuario: se reintenta en el siguiente ciclo.
      }
    }

    // Una notificación del navegador solo se puede pedir tras un gesto del usuario.
    function pedirPermiso() {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    void consultar();
    const temporizador = setInterval(consultar, INTERVALO_MS);
    window.addEventListener("pointerdown", pedirPermiso, { once: true });

    return () => {
      controlador.abort();
      clearInterval(temporizador);
      window.removeEventListener("pointerdown", pedirPermiso);
    };
  }, [idUsuario]);

  return { aviso, cerrarAviso };
}
