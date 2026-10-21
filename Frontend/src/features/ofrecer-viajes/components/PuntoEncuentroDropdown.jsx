"use client";

import BarrioDropdown from "./BarrioDropdown";
import puntosEncuentro from "../JS/puntosEncuentro";

const sinOpcionesAdicionales = [];

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
