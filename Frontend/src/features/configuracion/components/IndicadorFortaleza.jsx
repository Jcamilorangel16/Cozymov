// Indicador visual de la fortaleza de la nueva contraseña.

const ETIQUETAS = ["Sin evaluar", "Muy débil", "Débil", "Buena", "Fuerte"];

/**
 * Calcula un nivel de fortaleza entre 1 y 4 según longitud y variedad de caracteres.
 * @param {string} valor Contraseña escrita por el usuario.
 * @returns {{puntaje: number, etiqueta: string, clase: string}} Nivel calculado.
 */
function evaluarFortaleza(valor) {
  if (!valor) {
    return { puntaje: 0, etiqueta: ETIQUETAS[0], clase: "" };
  }

  let puntos = 0;
  if (valor.length >= 8) puntos += 1;
  if (valor.length >= 12) puntos += 1;
  if (/[a-z]/.test(valor) && /[A-Z]/.test(valor)) puntos += 1;
  if (/\d/.test(valor)) puntos += 1;
  if (/[^A-Za-z0-9]/.test(valor)) puntos += 1;

  const puntaje = Math.min(4, Math.max(1, Math.ceil((puntos * 4) / 5)));

  return {
    puntaje,
    etiqueta: ETIQUETAS[puntaje],
    clase: `config-fortaleza-${puntaje}`,
  };
}

/**
 * Muestra barras y una etiqueta con la fortaleza de la contraseña.
 * @param {{contrasena: string}} props Contraseña que se evalúa.
 * @returns {JSX.Element} Indicador visual y accesible.
 */
export default function IndicadorFortaleza({ contrasena }) {
  const { puntaje, etiqueta, clase } = evaluarFortaleza(contrasena);

  return (
    <div className="config-fortaleza">
      <div className="config-fortaleza-barras" aria-hidden="true">
        {[1, 2, 3, 4].map((nivel) => (
          <span
            key={nivel}
            className={
              "config-fortaleza-barra" +
              (nivel <= puntaje ? ` ${clase}` : "")
            }
          />
        ))}
      </div>
      <small
        className={`config-fortaleza-texto ${clase}`}
        role="status"
        aria-live="polite"
      >
        Fortaleza: {etiqueta}
      </small>
    </div>
  );
}
