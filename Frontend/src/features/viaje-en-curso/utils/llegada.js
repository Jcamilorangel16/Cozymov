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

/** Tiempo que el pasajero tiene, desde que llega, para finalizar el viaje antes de que se cierre solo. */
export const MS_AUTOFINALIZAR = 60 * 60 * 1000;

const PREFIJO_LLEGADA = "cozymov-llegada-";

/**
 * Momento en que el viaje se finaliza solo si el pasajero no lo hizo.
 * @param {number} llegadaMs Marca de tiempo (ms) en que se detectó la llegada.
 * @returns {number} Marca de tiempo (ms) del cierre automático.
 */
export function limiteAutofinalizar(llegadaMs) {
  return llegadaMs + MS_AUTOFINALIZAR;
}

/**
 * @param {number|null|undefined} llegadaMs Marca de tiempo de la llegada, o null si aún no llegó.
 * @param {number} [ahoraMs] Momento de referencia.
 * @returns {boolean} true si ya pasó la hora desde la llegada y el viaje debe finalizarse solo.
 */
export function debeAutofinalizar(llegadaMs, ahoraMs = Date.now()) {
  return Number.isFinite(llegadaMs) && ahoraMs >= limiteAutofinalizar(llegadaMs);
}

/**
 * Guarda la hora de llegada para que sobreviva a recargas de la página.
 * @param {Pick<Storage, "setItem">|null|undefined} almacen Normalmente `localStorage`.
 * @param {string|number} idViaje Viaje al que pertenece la llegada.
 * @param {number} llegadaMs Marca de tiempo de la llegada.
 */
export function guardarLlegada(almacen, idViaje, llegadaMs) {
  try {
    almacen?.setItem(`${PREFIJO_LLEGADA}${idViaje}`, String(llegadaMs));
  } catch {
    // Sin almacenamiento (modo privado o cuota llena) el cierre automático solo vale mientras la vista esté abierta.
  }
}

/**
 * @param {Pick<Storage, "getItem">|null|undefined} almacen Normalmente `localStorage`.
 * @param {string|number} idViaje Viaje consultado.
 * @returns {number|null} Marca de tiempo de la llegada guardada, o null si no hay una válida.
 */
export function leerLlegada(almacen, idViaje) {
  try {
    const valor = Number(almacen?.getItem(`${PREFIJO_LLEGADA}${idViaje}`));
    return Number.isFinite(valor) && valor > 0 ? valor : null;
  } catch {
    return null;
  }
}

/**
 * Borra la llegada guardada (el viaje ya terminó).
 * @param {Pick<Storage, "removeItem">|null|undefined} almacen Normalmente `localStorage`.
 * @param {string|number} idViaje Viaje finalizado.
 */
export function borrarLlegada(almacen, idViaje) {
  try {
    almacen?.removeItem(`${PREFIJO_LLEGADA}${idViaje}`);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}
