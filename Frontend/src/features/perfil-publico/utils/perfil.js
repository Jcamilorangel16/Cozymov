// Utilidades de presentación del perfil público.

/** Inicial para el avatar del perfil. */
export function inicialNombre(nombre) {
  return String(nombre ?? "").trim().charAt(0).toUpperCase() || "?";
}

/**
 * "Miembro desde noviembre de 2026".
 * @param {string|null|undefined} fecha Fecha ISO de registro.
 */
export function formatearMiembroDesde(fecha) {
  const valor = new Date(fecha ?? "");
  if (Number.isNaN(valor.getTime())) return "";
  const texto = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(valor);
  return `Miembro desde ${texto}`;
}

/**
 * Estrellas llenas (redondeadas) para un promedio de 1 a 5.
 * @param {number|null|undefined} promedio
 */
export function estrellasLlenas(promedio) {
  const n = Number(promedio);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}
