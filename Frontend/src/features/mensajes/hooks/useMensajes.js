"use client";
import { useCallback, useEffect, useState } from "react";

async function pedir(url, opciones) {
  const res = await fetch(url, opciones);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Error de conexión con el servidor.");
  }
  return data;
}

export function useMensajes(usuarioActualId) {
  const yo = String(usuarioActualId);

  const [vista, setVista] = useState("chats"); // "chats" | "nuevo"
  const [chats, setChats] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [contactoSeleccionado, setContactoSeleccionado] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [error, setError] = useState(null);

  // Chats existentes del usuario de la sesión
  useEffect(() => {
    if (contactoSeleccionado || vista !== "chats") return;
    pedir("/api/mensajes/chats")
      .then((data) => {
        setError(null);
        setChats(data);
      })
      .catch((e) => setError(e.message));
  }, [vista, contactoSeleccionado]);

  // Usuarios reales para iniciar un chat nuevo
  useEffect(() => {
    if (contactoSeleccionado || vista !== "nuevo") return;
    const t = setTimeout(() => {
      pedir(`/api/mensajes/contactos?q=${encodeURIComponent(busqueda)}`)
        .then((data) => {
          setError(null);
          setContactos(data);
        })
        .catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [vista, busqueda, contactoSeleccionado]);

  const cargarConversacion = useCallback(async () => {
    if (!contactoSeleccionado) return;
    try {
      const data = await pedir(
        `/api/mensajes?usuario1=${yo}&usuario2=${contactoSeleccionado.id}`,
      );
      setMensajes(data);
    } catch (e) {
      setError(e.message);
    }
  }, [yo, contactoSeleccionado]);

  // Conversación abierta, refrescada cada 4 segundos
useEffect(() => {
  if (!contactoSeleccionado) return;

  let activo = true;

  const cargar = () =>
    pedir(`/api/mensajes?usuario1=${yo}&usuario2=${contactoSeleccionado.id}`)
      .then((data) => {
        if (activo) setMensajes(data);
      })
      .catch((e) => {
        if (activo) setError(e.message);
      });

  cargar();
  const intervalo = setInterval(cargar, 4000);

  return () => {
    activo = false;
    clearInterval(intervalo);
  };
}, [yo, contactoSeleccionado]);

  async function manejarEnvio(texto) {
    try {
      setError(null);
      await pedir("/api/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_emisor: yo,
          id_receptor: String(contactoSeleccionado.id),
          contenido: texto,
        }),
      });
      await cargarConversacion();
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }

  function volverALista() {
  setContactoSeleccionado(null);
  setMensajes([]);
  setError(null);
  setVista("chats");
  setBusqueda("");
}

function abrirChat(contacto) {
  setMensajes([]);
  setError(null);
  setContactoSeleccionado(contacto);
}

  return {
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
};
}
