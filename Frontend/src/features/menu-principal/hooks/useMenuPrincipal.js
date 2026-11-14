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
  const [busquedaRuta, setBusquedaRuta] = useState(null);
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
      setBusquedaRuta(null);
      setMensajeBusqueda("");
    }
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
  }

  function buscarRuta(ruta, intencion) {
    setBusquedaRuta({ ...ruta, intencion });
    setVistaActiva("buscar");
    setContactoInicial(null);
    setViajeSeleccionado(null);
    setMensajeBusqueda("");
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
    busquedaRuta,
    buscarRuta,
    mensajeBusqueda,
    setMensajeBusqueda,
    pasajeroSeleccionado,
    setPasajeroSeleccionado,
    mensajePasajero,
    setMensajePasajero,
    irAVista,
  };
}
