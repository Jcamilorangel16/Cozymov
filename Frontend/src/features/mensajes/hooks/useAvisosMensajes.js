// Avisa al usuario de los mensajes nuevos, esté en la sección que esté.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTiempoReal } from "../../../hooks/useTiempoReal";
import {
  detectarMensajesNuevos,
  registrarMensajeAvisado,
  resumirMensaje,
  textoAvisoMensajes,
} from "../utils/avisosMensajes";

/** Sin tiempo real, cada cuánto se consulta la lista de chats en busca de mensajes nuevos. */
const INTERVALO_MS = 10_000;

/** Máximo de notificaciones del navegador por aviso, para no inundar al usuario. */
const MAX_NOTIFICACIONES = 3;

function notificarNavegador(chat, alAbrirRef) {
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

function avisar(nuevos, setAviso, alAbrirRef) {
  const { titulo, texto } = textoAvisoMensajes(nuevos);
  const { id, nombre } = nuevos[0];
  setAviso({ titulo, texto, contacto: { id, nombre } });
  nuevos.slice(0, MAX_NOTIFICACIONES).forEach((chat) => notificarNavegador(chat, alAbrirRef));
}

/**
 * Cuando llega un mensaje nuevo muestra un aviso en la aplicación y, si el usuario concedió
 * el permiso, una notificación del navegador. Con tiempo real el aviso es inmediato; sin él
 * se consulta periódicamente la lista de chats, como antes.
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
  // Chats de la consulta anterior; null hasta la primera, que solo fija la referencia.
  const previosRef = useRef(null);
  const consultarRef = useRef(null);

  useEffect(() => {
    alAbrirRef.current = alAbrirChat;
    silenciarRef.current = silenciar;
  });

  const cerrarAviso = useCallback(() => setAviso(null), []);

  const { conectado } = useTiempoReal(
    {
      MensajeNuevo: (evento) => {
        if (String(evento.idReceptor) !== String(idUsuario)) return; // lo envié yo
        const chat = {
          id: String(evento.idEmisor),
          nombre: String(evento.nombreEmisor ?? "").trim() || "un contacto",
          texto: evento.contenido,
          cantidad: 1,
        };
        // Aunque no se muestre, cuenta como avisado: la consulta periódica no lo repetirá.
        previosRef.current = registrarMensajeAvisado(previosRef.current, chat);
        if (silenciarRef.current?.()) return;
        avisar([chat], setAviso, alAbrirRef);
      },
    },
    {
      activo: Boolean(idUsuario),
      // Al reconectar se avisa de lo que llegó durante la desconexión.
      alResincronizar: () => void consultarRef.current?.(),
    },
  );

  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    const { signal } = controlador;

    async function consultar() {
      try {
        const respuesta = await fetch("/api/mensajes/chats", { cache: "no-store", signal });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (!Array.isArray(datos) || signal.aborted) return;

        const nuevos = detectarMensajesNuevos(previosRef.current, datos);
        previosRef.current = datos;
        if (nuevos.length === 0 || silenciarRef.current?.()) return;
        avisar(nuevos, setAviso, alAbrirRef);
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

    consultarRef.current = consultar;
    void consultar();
    window.addEventListener("pointerdown", pedirPermiso, { once: true });

    return () => {
      controlador.abort();
      consultarRef.current = null;
      previosRef.current = null;
      window.removeEventListener("pointerdown", pedirPermiso);
    };
  }, [idUsuario]);

  // Respaldo HTTP mientras no hay conexión de tiempo real.
  useEffect(() => {
    if (!idUsuario || conectado) return undefined;
    const temporizador = setInterval(() => void consultarRef.current?.(), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [idUsuario, conectado]);

  return { aviso, cerrarAviso };
}
