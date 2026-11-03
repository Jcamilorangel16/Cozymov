// Configura el selector reutilizable para puntos específicos de encuentro.
"use client";

import BarrioDropdown from "./BarrioDropdown";
import puntosEncuentro from "../constants/puntosEncuentro";

const sinOpcionesAdicionales = [];

/**
 * Presenta el selector de punto de encuentro para un viaje.
 * @param {{value: string, onChange: (value: string) => void}} props Valor y controlador.
 * @returns Selector de ubicación con opciones de encuentro.
 */
export default function PuntoEncuentroDropdown({ value, onChange }) {
  return (
    <BarrioDropdown
      id="punto-encuentro-viaje"
      label="Punto específico de encuentro"
      value={value}
      onChange={onChange}
      opcionesBase={puntosEncuentro}
      opcionesAdicionales={sinOpcionesAdicionales}
      tipoOpcion="punto de encuentro"
      textoSeleccion="Seleccionar punto de encuentro"
    />
  );
}
