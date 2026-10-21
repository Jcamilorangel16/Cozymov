"use client";

import { useMemo, useRef, useState } from "react";
import barriosRutaCotidiana from "../JS/barriosRutaCotidiana";
import "../CSS/RutaCotidianaSelect.css";

const destinoRutaCotidiana = "Universidad Popular Del Cesar";

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function obtenerBarrioSeleccionado(ruta) {
  const separadorDestino = ` - ${destinoRutaCotidiana}`;
  return ruta.endsWith(separadorDestino)
    ? ruta.slice(0, -separadorDestino.length)
    : "";
}

export default function RutaCotidianaSelect({ id, value, onChange }) {
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

  function seleccionarBarrio(barrio) {
    setBusqueda(barrio);
    setAbierto(false);
    setIndiceActivo(-1);
    onChange(`${barrio} - ${destinoRutaCotidiana}`);
    inputRef.current?.setCustomValidity("");
  }

  function manejarCambio(evento) {
    setBusqueda(evento.target.value);
    setAbierto(true);
    setIndiceActivo(-1);
    onChange("");
    evento.target.setCustomValidity("Selecciona un barrio de la lista.");
  }

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
