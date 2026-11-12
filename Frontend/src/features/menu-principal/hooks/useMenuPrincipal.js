// Centraliza la vista activa y las selecciones entre secciones del menú.
"use client";

import { useEffect, useState } from "react";

/**
 * Gestiona el estado de navegación local del menú principal.
 * @returns Vista activa, selecciones relacionadas y acción de navegación.
 */
export function useMenuPrincipal() {
  // Sección visible y estado local de sus dos flujos interactivos.
  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [contactoInicial, setContactoInicial] = useState(null);
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);
  const [mensajePasajero, setMensajePasajero] = useState("");

  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  /**
   * Cambia de sección y reinicia el estado asociado a la sección destino.
   * @param {string} id Identificador de la sección del menú.
   * @returns {void}
   */
  function irAVista(id) {
    setVistaActiva(id);
    if (id !== "mensajes") {
      setContactoInicial(null);
    }
    if (id === "buscar") {
      setViajeSeleccionado(null);
      setMensajeBusqueda("");
    }
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
  }

  function abrirChatConUsuario(contacto) {
    setContactoInicial(contacto);
    setVistaActiva("mensajes");
  }

  return {
    vistaActiva,
    contactoInicial,
    abrirChatConUsuario,
    viajeSeleccionado,
    setViajeSeleccionado,
    mensajeBusqueda,
    setMensajeBusqueda,
    pasajeroSeleccionado,
    setPasajeroSeleccionado,
    mensajePasajero,
    setMensajePasajero,
    irAVista,
  };
}
