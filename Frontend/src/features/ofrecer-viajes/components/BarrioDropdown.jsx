// Presenta el desplegable accesible para buscar barrios y lugares de encuentro.
"use client";

import { useBarrioDropdown } from "../hooks/useBarrioDropdown";
import "../styles/BarrioDropdown.css";

/**
 * Presenta una lista accesible y filtrable de barrios o lugares.
 * @param {object} props Configuración de opciones y valor seleccionado.
 * @returns Selector desplegable de ubicación.
 */
export default function BarrioDropdown({
  id,
  label,
  value,
  onChange,
  opcionesBase,
  opcionesAdicionales,
  tipoOpcion = "barrio",
  textoSeleccion = "Seleccionar barrio",
}) {
  const {
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
  } = useBarrioDropdown({ value, onChange, opcionesBase, opcionesAdicionales });

  return (
    <div className="dropdown position-relative" ref={contenedorRef}>
      <button
        ref={botonRef}
        type="button"
        className="btn btn-light border rounded-3 w-100 d-flex align-items-center justify-content-between text-start py-3"
        id={`${id}-boton`}
        aria-expanded={abierto}
        aria-controls={`${id}-menu`}
        onClick={() => {
          setBusqueda("");
          setAbierto((anterior) => !anterior);
        }}
      >
        <span>
          <span className="d-block small text-secondary">{label}</span>
          <span className="fw-semibold">{value || textoSeleccion}</span>
        </span>
        <span className="text-primary" aria-hidden="true">{abierto ? "▴" : "▾"}</span>
      </button>

      {abierto && (
        <div className="dropdown-menu show w-100 p-2 shadow" id={`${id}-menu`}>
          <label className="visually-hidden" htmlFor={`${id}-busqueda`}>
            Buscar {tipoOpcion} para {label.toLowerCase()}
          </label>
          <input
            id={`${id}-busqueda`}
            className="form-control mb-2"
            type="search"
            placeholder={`Escribe para buscar ${tipoOpcion}...`}
            autoComplete="off"
            autoFocus
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={`${id}-opciones`}
            aria-activedescendant={
              indiceActivo >= 0 ? `${id}-opcion-${indiceActivo}` : undefined
            }
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
              setIndiceActivo(-1);
            }}
            onKeyDown={manejarTeclado}
          />
          <ul
            className="barrio-dropdown__opciones"
            id={`${id}-opciones`}
            role="listbox"
            aria-label={`${tipoOpcion} para ${label.toLowerCase()}`}
          >
            {barriosFiltrados.length > 0 ? (
              barriosFiltrados.map((barrio, indice) => (
                <li
                  className={`barrio-dropdown__opcion${indice === indiceActivo ? " barrio-dropdown__opcion--activa" : ""}`}
                  id={`${id}-opcion-${indice}`}
                  key={`${barrio}-${indice}`}
                  role="option"
                  aria-selected={barrio === value}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onClick={() => {
                    seleccionarBarrio(barrio);
                    botonRef.current?.focus();
                  }}
                >
                  {barrio}
                </li>
              ))
            ) : (
              <li className="barrio-dropdown__sin-resultados" role="status">
                No se encontraron {tipoOpcion === "barrio" ? "barrios" : "opciones"}.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
