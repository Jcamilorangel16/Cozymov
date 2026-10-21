// Presenta la búsqueda accesible de barrio de origen para la ruta cotidiana.
"use client";

import { useRutaCotidianaSelect } from "../hooks/useRutaCotidianaSelect";
import "../styles/RutaCotidianaSelect.css";

/**
 * Muestra una búsqueda accesible de barrios para la ruta cotidiana.
 * @param {{id: string, value: string, onChange: (value: string) => void}} props Datos del control.
 * @returns Selector filtrable de ruta cotidiana.
 */
export default function RutaCotidianaSelect({ id, value, onChange }) {
  const {
    inputRef,
    busqueda,
    abierto,
    setAbierto,
    indiceActivo,
    barriosFiltrados,
    seleccionarBarrio,
    manejarCambio,
    manejarTeclado,
    obtenerBarrioSeleccionado,
  } = useRutaCotidianaSelect({ value, onChange });

  return (
    <div className="ruta-cotidiana">
      <input
        ref={inputRef}
        className="form-control ruta-cotidiana__input"
        id={id}
        type="text"
        placeholder="Escribe para buscar un barrio"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={abierto}
        aria-controls={`${id}-opciones`}
        aria-activedescendant={
          indiceActivo >= 0 ? `${id}-opcion-${indiceActivo}` : undefined
        }
        required
        value={abierto ? busqueda : value}
        onChange={manejarCambio}
        onFocus={() => {
          const barrioSeleccionado = obtenerBarrioSeleccionado(value);
          if (barrioSeleccionado) setBusqueda(barrioSeleccionado);
          setAbierto(true);
        }}
        onBlur={() => setAbierto(false)}
        onKeyDown={manejarTeclado}
      />
      {abierto && (
        <ul
          className="ruta-cotidiana__opciones"
          id={`${id}-opciones`}
          role="listbox"
        >
          {barriosFiltrados.length > 0 ? (
            barriosFiltrados.map((barrio, indice) => (
              <li
                className={`ruta-cotidiana__opcion${indice === indiceActivo ? " ruta-cotidiana__opcion--activa" : ""}`}
                id={`${id}-opcion-${indice}`}
                key={`${barrio}-${indice}`}
                role="option"
                aria-selected={indice === indiceActivo}
                onMouseDown={(evento) => evento.preventDefault()}
                onClick={() => seleccionarBarrio(barrio)}
              >
                {barrio}
              </li>
            ))
          ) : (
            <li className="ruta-cotidiana__sin-resultados" role="status">
              No se encontraron barrios.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
