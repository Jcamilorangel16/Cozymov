"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTiempoReal } from "../../../hooks/useTiempoReal";
import {
  fusionarMensaje,
  marcarLeidosHasta,
  mensajeDesdeEvento,
  perteneceAConversacion,
  reconciliarMensajes,
} from "../utils/tiempoRealMensajes";

/** Sin tiempo real, la conversación abierta se vuelve a consultar con esta frecuencia. */
const INTERVALO_RESPALDO_MS = 4000;

async function pedir(url, opciones) {
  const res = await fetch(url, opciones);
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error ?? "Error de conexión con el servidor.");
  }
  return data;
}

export function useMensajes(usuarioActualId, contactoInicial = null) {
  const yo = String(usuarioActualId);

  const [vista, setVista] = useState("chats"); // "chats" | "nuevo"
  const [chats, setChats] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [contactoSeleccionado, setContactoSeleccionado] = useState(contactoInicial);
  const [mensajes, setMensajes] = useState([]);
  const [error, setError] = useState(null);
  // Cambia para volver a pedir la lista de chats (llegó un mensaje o se leyó uno).
  const [versionChats, setVersionChats] = useState(0);
  // Número de la última consulta de la conversación: una respuesta anterior se descarta.
  const consultaRef = useRef(0);

  const contactoId = contactoSeleccionado?.id;

  // Chats existentes del usuario de la sesión
  useEffect(() => {
    if (contactoSeleccionado || vista !== "chats") return;
    pedir("/api/mensajes/chats")
      .then((data) => {
        setError(null);
        setChats(data);
      })
      .catch((e) => setError(e.message));
  }, [vista, contactoSeleccionado, versionChats]);

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

  // Consulta (y marca como leídos) los mensajes de la conversación abierta.
  const cargarConversacion = useCallback(() => {
    if (!contactoId) return Promise.resolve();
    const numero = ++consultaRef.current;
    return pedir(`/api/mensajes?usuario1=${yo}&usuario2=${contactoId}`)
      .then((data) => {
        if (numero === consultaRef.current) {
          setMensajes((actuales) => reconciliarMensajes(actuales, data));
        }
      })
      .catch((e) => {
        if (numero === consultaRef.current) setError(e.message);
      });
  }, [yo, contactoId]);

  // Los mensajes nuevos y las lecturas llegan al instante; HTTP sigue siendo la fuente.
  const { conectado } = useTiempoReal(
    {
      MensajeNuevo: (evento) => {
        if (contactoSeleccionado) {
          if (!perteneceAConversacion(evento, yo, contactoSeleccionado.id)) return;
          setMensajes((lista) => fusionarMensaje(lista, mensajeDesdeEvento(evento)));
          // Si es para mí, la consulta de siempre lo marca como leído (y avisa al emisor).
          if (String(evento.idReceptor) === yo) void cargarConversacion();
        } else if (vista === "chats") {
          setVersionChats((version) => version + 1);
        }
      },
      MensajesLeidos: (evento) => {
        if (contactoSeleccionado) {
          if (
            String(evento.idEmisor) === yo &&
            String(evento.idLector) === String(contactoSeleccionado.id)
          ) {
            setMensajes((lista) => marcarLeidosHasta(lista, yo, evento.hastaIdMensaje));
          }
        } else if (vista === "chats" && String(evento.idLector) === yo) {
          // Leí en otra pestaña: cambian las insignias de «sin leer».
          setVersionChats((version) => version + 1);
        }
      },
    },
    {
      // Tras una desconexión se recupera por HTTP lo que pudo llegar mientras tanto.
      alResincronizar: () => {
        if (contactoSeleccionado) void cargarConversacion();
        else if (vista === "chats") setVersionChats((version) => version + 1);
      },
    },
  );

  // Al abrir la conversación. Al cambiar de contacto se descartan las respuestas pendientes.
  useEffect(() => {
    void cargarConversacion();
    return () => {
      consultaRef.current += 1;
    };
  }, [cargarConversacion]);

  // Sin conexión de tiempo real, consulta periódica como antes.
  useEffect(() => {
    if (!contactoId || conectado) return undefined;
    const intervalo = setInterval(() => void cargarConversacion(), INTERVALO_RESPALDO_MS);
    return () => clearInterval(intervalo);
  }, [contactoId, conectado, cargarConversacion]);

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
