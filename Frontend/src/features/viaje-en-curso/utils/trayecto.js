// Lógica pura: ¿el viaje en curso ya está en trayecto?

/**
 * Un viaje está en trayecto cuando llegó su hora de salida. Desde entonces el pasajero ya no
 * puede salirse: solo puede finalizarlo al llegar a su destino.
 * @param {{fecha_salida?: string, hora_salida?: string}|null|undefined} viaje Viaje en curso normalizado.
 * @param {Date} [ahora] Momento de referencia.
 * @returns {boolean} true si la hora de salida ya llegó.
 */
export function viajeEnTrayecto(viaje, ahora = new Date()) {
  const fecha = String(viaje?.fecha_salida ?? "").slice(0, 10);
  const hora = String(viaje?.hora_salida ?? "").slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const salida = new Date(`${fecha}T${/^\d{2}:\d{2}$/.test(hora) ? hora : "00:00"}:00`);
  return !Number.isNaN(salida.getTime()) && salida.getTime() <= ahora.getTime();
}
