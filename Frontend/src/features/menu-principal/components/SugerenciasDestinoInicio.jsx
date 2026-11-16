"use client";

/**
 * Lista de sugerencias del buscador de destino (patrón combobox/listbox).
 * @param {{id: string, sugerencias: string[], indiceActivo: number, onElegir: (destino: string) => void}} props
 * @returns Lista de opciones o nada si no hay sugerencias.
 */
export default function SugerenciasDestinoInicio({ id, sugerencias, indiceActivo, onElegir }) {
  if (sugerencias.length === 0) return null;

  return (
    <ul className="inicio-sugerencias" id={id} role="listbox" aria-label="Destinos sugeridos">
      {sugerencias.map((destino, indice) => (
        <li
          key={destino}
          id={`${id}-opcion-${indice}`}
          role="option"
          aria-selected={indice === indiceActivo}
          className={`inicio-sugerencia${indice === indiceActivo ? " inicio-sugerencia-activa" : ""}`}
          // mousedown evita que el input pierda el foco antes del clic.
          onMouseDown={(evento) => evento.preventDefault()}
          onClick={() => onElegir(destino)}
        >
          {destino}
        </li>
      ))}
    </ul>
  );
}
