// Gestiona la búsqueda y selección de la ruta cotidiana del vehículo.
"use client";

import { useMemo, useRef, useState } from "react";
import barriosRutaCotidiana from "../constants/barriosRutaCotidiana";
import { normalizarTexto } from "../utils/normalizarTexto";

const destinoRutaCotidiana = "Universidad Popular Del Cesar";

/**
 * Extrae el barrio de una ruta con destino universitario.
 * @param {string} ruta Ruta completa seleccionada.
 * @returns {string} Barrio de origen o cadena vacía.
 */
function obtenerBarrioSeleccionado(ruta) {
  const separadorDestino = ` - ${destinoRutaCotidiana}`;
  return ruta.endsWith(separadorDestino)
    ? ruta.slice(0, -separadorDestino.length)
    : "";
}

/**
 * Gestiona el estado y las acciones del selector de ruta cotidiana.
 * @param {{id: string, value: string, onChange: (value: string) => void}} opciones Datos del selector.
 * @returns Estado, referencia y acciones para presentar el selector.
 */
export function useRutaCotidianaSelect({ value, onChange }) {
  const inputRef = useRef(null);
  const [busqueda, setBusqueda] = useState(() => obtenerBarrioSeleccionado(value));
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);

  const barriosFiltrados = useMemo(() => {
    const consulta = normalizarTexto(busqueda);
    if (!consulta) return barriosRutaCotidiana;

    return barriosRutaCotidiana.filter((barrio) =>
      normalizarTexto(barrio).includes(consulta),
    );
  }, [busqueda]);

  /**
   * Elige un barrio y construye su ruta hacia la universidad.
   * @param {string} barrio Barrio seleccionado.
   * @returns {void}
   */
  function seleccionarBarrio(barrio) {
    setBusqueda(barrio);
    setAbierto(false);
    setIndiceActivo(-1);
    onChange(`${barrio} - ${destinoRutaCotidiana}`);
    inputRef.current?.setCustomValidity("");
  }

  /**
   * Actualiza la búsqueda y marca que se debe elegir una opción válida.
   * @param {React.ChangeEvent<HTMLInputElement>} evento Evento del campo de búsqueda.
   * @returns {void}
   */
  function manejarCambio(evento) {
    setBusqueda(evento.target.value);
    setAbierto(true);
    setIndiceActivo(-1);
    onChange("");
    evento.target.setCustomValidity("Selecciona un barrio de la lista.");
  }

  /**
   * Permite recorrer las opciones y seleccionarlas desde el teclado.
   * @param {React.KeyboardEvent<HTMLInputElement>} evento Evento de teclado.
   * @returns {void}
   */
  function manejarTeclado(evento) {
    if (evento.key === "Escape") {
      setAbierto(false);
      setIndiceActivo(-1);
      return;
    }

    if (evento.key === "ArrowDown" && barriosFiltrados.length > 0) {
      evento.preventDefault();
      setAbierto(true);
      setIndiceActivo((actual) => (actual + 1) % barriosFiltrados.length);
    } else if (evento.key === "ArrowUp" && barriosFiltrados.length > 0) {
      evento.preventDefault();
      setAbierto(true);
      setIndiceActivo((actual) =>
        actual <= 0 ? barriosFiltrados.length - 1 : actual - 1,
      );
    } else if (
      evento.key === "Enter" &&
      abierto &&
      indiceActivo >= 0 &&
      barriosFiltrados[indiceActivo]
    ) {
      evento.preventDefault();
      seleccionarBarrio(barriosFiltrados[indiceActivo]);
    }
  }

  return {
    inputRef,
    busqueda,
    abierto,
    setAbierto,
    indiceActivo,
    setIndiceActivo,
    barriosFiltrados,
    seleccionarBarrio,
    manejarCambio,
    manejarTeclado,
    obtenerBarrioSeleccionado,
  };
}
