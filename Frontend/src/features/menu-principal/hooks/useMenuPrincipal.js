// Centraliza la vista activa y las selecciones entre secciones del menú.
"use client";

import { useEffect, useRef, useState } from "react";
import { apilarVista, desapilarVista, historialAlVolverAlViaje } from "../utils/historialVistas";

/**
 * Gestiona el estado de navegación local del menú principal.
 * @returns Vista activa, selecciones relacionadas y acción de navegación.
 */
export function useMenuPrincipal() {
  // Sección visible y estado local de sus dos flujos interactivos.
  const [vistaActiva, setVistaActiva] = useState("inicio");
  // Secciones por las que se pasó, para la flecha «volver». La ref evita leer una vista vieja
  // cuando irAVista se llama desde un callback asíncrono.
  const [historial, setHistorial] = useState([]);
  const vistaRef = useRef("inicio");
  const [contactoInicial, setContactoInicial] = useState(null);
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);
  const [mensajePasajero, setMensajePasajero] = useState("");

  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  /**
   * Muestra una sección y reinicia el estado asociado a ella, sin tocar el historial.
   * @param {string} id Identificador de la sección del menú.
   * @returns {void}
   */
  function mostrarVista(id, conservarViaje = false) {
    vistaRef.current = id;
    setVistaActiva(id);
    if (id !== "mensajes") {
      setContactoInicial(null);
    }
    if (id === "buscar") {
      // Al regresar desde la conversación se conserva el viaje (y la búsqueda) seleccionado.
      if (!conservarViaje) setViajeSeleccionado(null);
      setMensajeBusqueda("");
    } else if (id !== "mensajes") {
      setViajeSeleccionado(null);
    }
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
  }

  /**
   * Cambia de sección recordando la actual para poder volver a ella.
   * @param {string} id Identificador de la sección del menú.
   * @returns {void}
   */
  function irAVista(id) {
    const actual = vistaRef.current;
    setHistorial((previo) => apilarVista(previo, actual, id));
    mostrarVista(id);
  }

  /** Regresa a la última sección visitada (la que se tenía antes de la actual). */
  function volver() {
    const { destino, historial: resto } = desapilarVista(historial);
    if (destino === null) return;
    setHistorial(resto);
    mostrarVista(destino, destino === "buscar" && viajeSeleccionado !== null);
  }

  /**
   * Abre la conversación con el conductor de un viaje sin reservarlo, guardando el viaje y la
   * búsqueda para poder regresar a él.
   * @param {{id: string, nombre: string}} contacto Conductor del viaje.
   * @param {object} contextoViaje Viaje y filtros (ver contextoDeViaje).
   */
  function abrirChatDesdeViaje(contacto, contextoViaje) {
    setViajeSeleccionado(contextoViaje);
    abrirChatConUsuario(contacto);
  }

  /** Regresa a «Buscar» con el viaje seleccionado, para confirmar o cancelar la reserva. */
  function volverAlViaje() {
    if (!viajeSeleccionado) return;
    setHistorial(historialAlVolverAlViaje(historial));
    mostrarVista("buscar", true);
  }

  function abrirChatConUsuario(contacto) {
    const actual = vistaRef.current;
    setHistorial((previo) => apilarVista(previo, actual, "mensajes"));
    setContactoInicial(contacto);
    vistaRef.current = "mensajes";
    setVistaActiva("mensajes");
  }

  return {
    vistaActiva,
    contactoInicial,
    abrirChatConUsuario,
    abrirChatDesdeViaje,
    volverAlViaje,
    viajeSeleccionado,
    setViajeSeleccionado,
    mensajeBusqueda,
    setMensajeBusqueda,
    pasajeroSeleccionado,
    setPasajeroSeleccionado,
    mensajePasajero,
    setMensajePasajero,
    irAVista,
    volver,
    // Sección a la que llevaría la flecha, o null si aún no se ha cambiado de sección.
    vistaAnterior: historial.length > 0 ? historial[historial.length - 1] : null,
  };
}
