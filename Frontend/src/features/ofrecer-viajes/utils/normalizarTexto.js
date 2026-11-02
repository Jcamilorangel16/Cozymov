// Normaliza texto para comparar opciones sin distinguir acentos ni mayúsculas.

/**
 * Quita diferencias de acentos y mayúsculas para comparar texto.
 * @param {string} texto Texto que se normalizará.
 * @returns {string} Texto normalizado para comparación.
 */
export function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}
