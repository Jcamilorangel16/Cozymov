// Convierte la marca de tiempo de un mensaje a la hora local del dispositivo.

/**
 * Interpreta la fecha del servidor. Si llega sin zona horaria (sin «Z» ni
 * desfase) se asume UTC, porque el backend guarda los mensajes en UTC.
 * @param {string} valor Fecha ISO del mensaje.
 * Las fechas anteriores a 2000 (p. ej. 0001-01-01, el valor vacío de mensajes
 * antiguos guardados sin hora) se descartan: no son una hora real.
 * @returns {Date|null} Fecha válida o null.
 */
export function parsearFechaMensaje(valor) {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const texto = valor.trim();
  const tieneZona = /(Z|[+-]\d{2}:?\d{2})$/i.test(texto);
  const fecha = new Date(tieneZona ? texto : `${texto}Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.getUTCFullYear() < 2000) return null;
  return fecha;
}

/**
 * Hora del mensaje en la zona horaria y formato del dispositivo.
 * @param {string} valor Fecha ISO del mensaje.
 * @returns {string} Hora local, p. ej. «3:05 p. m.», o cadena vacía si no es válida.
 */
export function horaLocalMensaje(valor) {
  const fecha = parsearFechaMensaje(valor);
  if (!fecha) return "";
  return fecha.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
