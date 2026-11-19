// Control reutilizable para adjuntar imágenes y documentos del vehículo.
"use client";

import { useRef, useState } from "react";
import { TIPOS_ARCHIVO_PERMITIDOS } from "../constants/vehiculos";
import { validarArchivoVehiculo } from "../validations/vehiculos";

/**
 * Permite seleccionar y quitar un archivo con validación local.
 * @param {{id: string, label: string, tipoArchivo: "imagen"|"pdf", archivo: File|null, requerido?: boolean, mostrarErrorRequerido?: boolean, onChange: (archivo: File|null) => void}} props Datos del campo.
 * @returns Campo de selección de archivo.
 */
export default function CampoArchivo({
  id,
  label,
  tipoArchivo,
  archivo,
  requerido = true,
  mostrarErrorRequerido = false,
  onChange,
}) {
  const inputRef = useRef(null);
  const [errorValidacion, setErrorValidacion] = useState("");
  const error = errorValidacion || (
    mostrarErrorRequerido && requerido && !archivo ? "Completa este campo." : ""
  );

  function seleccionarArchivo(evento) {
    const seleccionado = evento.target.files?.[0];
    if (!seleccionado) return;

    const mensaje = validarArchivoVehiculo(seleccionado, tipoArchivo);
    if (mensaje) {
      evento.target.value = "";
      onChange(null);
      setErrorValidacion(mensaje);
      return;
    }

    setErrorValidacion("");
    onChange(seleccionado);
  }

  function quitarArchivo() {
    onChange(null);
    setErrorValidacion("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="registro-vehiculo__field">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        className={`form-control${error ? " is-invalid" : ""}`}
        id={id}
        type="file"
        accept={TIPOS_ARCHIVO_PERMITIDOS[tipoArchivo].accept}
        required={requerido}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={seleccionarArchivo}
      />
      {archivo && (
        <div className="registro-vehiculo__archivo-seleccionado">
          <span className="text-secondary" title={archivo.name}>{archivo.name}</span>
          <button
            type="button"
            className="btn btn-link btn-sm p-0"
            aria-label={`Quitar ${label.toLowerCase()}`}
            onClick={quitarArchivo}
          >
            Quitar
          </button>
        </div>
      )}
      {error && <div className="invalid-feedback d-block" id={`${id}-error`}>{error}</div>}
    </div>
  );
}
