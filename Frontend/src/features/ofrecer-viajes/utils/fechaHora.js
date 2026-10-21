// Convierte fechas locales al formato que usan los controles de salida.

/**
 * Obtiene las partes de fecha y hora local para controles HTML.
 * @param {Date} fecha Fecha y hora local que se desea separar.
 * @returns {{fecha: string, hora: string}} Valores para controles date y time.
 */
export function obtenerPartesFechaHora(fecha) {
  /**
   * Completa con cero los valores numéricos menores de diez.
   * @param {number} numero Valor a completar.
   * @returns {string} Valor con dos dígitos.
   */
  const dosDigitos = (numero) => String(numero).padStart(2, "0");
  return {
    fecha: `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`,
    hora: `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`,
  };
}

/**
 * Formatea un precio en pesos colombianos.
 * @param {number|string} precio Valor numérico que se mostrará.
 * @returns {string} Valor monetario con formato COP.
 */
export function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(precio));
}
