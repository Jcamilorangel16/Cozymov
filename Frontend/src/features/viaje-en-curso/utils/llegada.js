// Lógica pura para decidir si el pasajero llegó a su destino según el GPS.

/** Distancia máxima al destino para considerar que el pasajero llegó. */
export const METROS_LLEGADA = 100;

/**
 * Peor precisión del GPS que se acepta. Las lecturas más imprecisas (típicas de un equipo sin
 * GPS que ubica por Wi-Fi o red) no sirven para dar el viaje por terminado.
 */
export const PRECISION_MAXIMA_METROS = 150;

/** Lecturas seguidas dentro del radio que se exigen: un solo punto ruidoso no finaliza el viaje. */
export const LECTURAS_PARA_LLEGAR = 2;

/**
 * Indica si una lectura del GPS cuenta como «estoy en el destino».
 * @param {{metrosAlDestino: number, precision?: number|null}} lectura Distancia al destino y precisión del GPS.
 * @param {number} [radio] Radio de llegada en metros.
 * @returns {boolean} true si está dentro del radio y la lectura es suficientemente precisa.
 */
export function esLecturaDeLlegada({ metrosAlDestino, precision }, radio = METROS_LLEGADA) {
  if (!Number.isFinite(metrosAlDestino) || metrosAlDestino > radio) return false;
  // Sin dato de precisión se confía en la lectura; con dato, debe ser aceptable.
  return precision == null || (Number.isFinite(precision) && precision <= PRECISION_MAXIMA_METROS);
}

/**
 * Actualiza el contador de lecturas consecutivas dentro del destino.
 * @param {number} consecutivas Lecturas seguidas hasta ahora.
 * @param {boolean} enDestino Si la última lectura cuenta como llegada.
 * @returns {number} Nuevo contador: suma uno o vuelve a cero si la lectura salió del radio.
 */
export function contarLecturasEnDestino(consecutivas, enDestino) {
  return enDestino ? consecutivas + 1 : 0;
}

/**
 * @param {number} consecutivas Lecturas seguidas dentro del destino.
 * @returns {boolean} true cuando ya hay suficientes lecturas para dar la llegada por confirmada.
 */
export function llegadaConfirmada(consecutivas) {
  return consecutivas >= LECTURAS_PARA_LLEGAR;
}
