"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import barriosRutaCotidiana from "../JS/barriosRutaCotidiana";
import "../CSS/BarrioDropdown.css";

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

export default function BarrioDropdown({
  id,
  label,
  value,
  onChange,
  opcionesBase = barriosRutaCotidiana,
  opcionesAdicionales = [],
  tipoOpcion = "barrio",
  textoSeleccion = "Seleccionar barrio",
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

    function cerrarAlHacerClickFuera(evento) {
      if (!contenedorRef.current?.contains(evento.target)) {
        setAbierto(false);
      }
    }

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

  function seleccionarBarrio(barrio) {
    onChange(barrio);
    setBusqueda("");
    setAbierto(false);
    setIndiceActivo(-1);
  }

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
