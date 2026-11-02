// Gestiona el filtrado, la navegación y la selección del desplegable de barrios.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import barriosRutaCotidiana from "../constants/barriosRutaCotidiana";
import { normalizarTexto } from "../utils/normalizarTexto";

/**
 * Gestiona el estado y las acciones del selector de barrios.
 * @param {object} opciones Identificador, valor, opciones y callback de selección.
 * @returns Estado, referencias y acciones para presentar el desplegable.
 */
export function useBarrioDropdown({
  onChange,
  opcionesBase = barriosRutaCotidiana,
  opcionesAdicionales = [],
}) {
  const contenedorRef = useRef(null);
  const botonRef = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const barriosFiltrados = useMemo(() => {
    const consulta = normalizarTexto(busqueda);
    const opciones = [...opcionesBase, ...opcionesAdicionales];
    if (!consulta) return opciones;

    return opciones.filter((barrio) =>
      normalizarTexto(barrio).includes(consulta),
    );
  }, [busqueda, opcionesAdicionales, opcionesBase]);

  useEffect(() => {
    if (!abierto) return undefined;

    /**
     * Cierra la lista cuando el clic ocurre fuera del componente.
     * @param {PointerEvent} evento Evento de puntero del documento.
     * @returns {void}
     */
    function cerrarAlHacerClickFuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) {
        setAbierto(false);
      }
    }

    /**
     * Cierra la lista y devuelve el foco al botón al pulsar Escape.
     * @param {KeyboardEvent} evento Evento de teclado del documento.
     * @returns {void}
     */
    function cerrarConEscape(evento) {
      if (evento.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", cerrarAlHacerClickFuera);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlHacerClickFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierto]);

  /**
   * Selecciona una opción y reinicia el estado del desplegable.
   * @param {string} barrio Opción seleccionada.
   * @returns {void}
   */
  function seleccionarBarrio(barrio) {
    onChange(barrio);
    setBusqueda("");
    setAbierto(false);
    setIndiceActivo(-1);
  }

  /**
   * Navega las opciones visibles y confirma la selección desde el teclado.
   * @param {React.KeyboardEvent<HTMLInputElement>} evento Evento de teclado.
   * @returns {void}
   */
  function manejarTeclado(evento) {
    if (evento.key === "ArrowDown" && barriosFiltrados.length > 0) {
      evento.preventDefault();
      setIndiceActivo((actual) => (actual + 1) % barriosFiltrados.length);
    } else if (evento.key === "ArrowUp" && barriosFiltrados.length > 0) {
      evento.preventDefault();
      setIndiceActivo((actual) =>
        actual <= 0 ? barriosFiltrados.length - 1 : actual - 1,
      );
    } else if (
      evento.key === "Enter" &&
      indiceActivo >= 0 &&
      barriosFiltrados[indiceActivo]
    ) {
      evento.preventDefault();
      seleccionarBarrio(barriosFiltrados[indiceActivo]);
      botonRef.current?.focus();
    }
  }

  return {
    contenedorRef,
    botonRef,
    abierto,
    setAbierto,
    busqueda,
    setBusqueda,
    indiceActivo,
    setIndiceActivo,
    barriosFiltrados,
    seleccionarBarrio,
    manejarTeclado,
  };
}
