// Lógica pura del buscador «¿A dónde quieres ir?» de Inicio (sin React ni red).

/**
 * Normaliza un texto para comparar sin mayúsculas, acentos ni espacios repetidos.
 * @param {unknown} valor Texto original.
 * @returns {string} Texto normalizado.
 */
export function normalizarDestino(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Une el catálogo de barrios con los destinos de las rutas persistidas.
 * Deduplica ignorando mayúsculas y acentos; conserva la primera grafía vista.
 * @param {string[]} barrios Catálogo local de barrios.
 * @param {Array<{destino?: string}>} rutas Rutas devueltas por /api/rutas.
 * @returns {string[]} Destinos únicos ordenados alfabéticamente.
 */
export function construirCatalogoDestinos(barrios, rutas) {
  const vistos = new Map();
  const candidatos = [
    ...barrios,
    ...(Array.isArray(rutas) ? rutas.map((ruta) => ruta?.destino) : []),
  ];
  for (const candidato of candidatos) {
    const texto = String(candidato ?? "").replace(/\s+/g, " ").trim();
    const clave = normalizarDestino(texto);
    if (clave && !vistos.has(clave)) vistos.set(clave, texto);
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, "es"));
}

/**
 * Filtra el catálogo según lo escrito; primero las coincidencias al inicio.
 * @param {string[]} catalogo Destinos disponibles.
 * @param {string} consulta Texto del input.
 * @param {number} [limite] Máximo de sugerencias.
 * @returns {string[]} Sugerencias filtradas.
 */
export function filtrarSugerencias(catalogo, consulta, limite = 8) {
  const termino = normalizarDestino(consulta);
  if (!termino) return [];
  const alInicio = [];
  const contiene = [];
  for (const destino of catalogo) {
    const clave = normalizarDestino(destino);
    if (clave.startsWith(termino)) alInicio.push(destino);
    else if (clave.includes(termino)) contiene.push(destino);
  }
  return [...alInicio, ...contiene].slice(0, limite);
}

/**
 * Devuelve las rutas persistidas cuyo destino coincide con el elegido.
 * No inventa rutas: si no hay coincidencia exacta, la lista queda vacía.
 * @param {Array<{idRuta: number, origen: string, destino: string}>} rutas Rutas reales.
 * @param {string} destino Destino elegido.
 * @returns {Array} Rutas compatibles.
 */
export function rutasCompatibles(rutas, destino) {
  const clave = normalizarDestino(destino);
  if (!clave || !Array.isArray(rutas)) return [];
  return rutas.filter(
    (ruta) => ruta?.idRuta != null && normalizarDestino(ruta.destino) === clave,
  );
}

/**
 * Combina fecha (YYYY-MM-DD) y hora (HH:mm) en el formato de /api/solicitudes.
 * @param {string} fecha Fecha elegida.
 * @param {string} hora Hora elegida.
 * @returns {string} Fecha y hora local con segundos, o cadena vacía si falta algo.
 */
export function combinarFechaHora(fecha, hora) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return "";
  return `${fecha}T${hora}:00`;
}

/**
 * Valida el formulario de solicitud sin red.
 * @param {{precio: string, fecha: string, hora: string, idRuta: string}} campos Valores del formulario.
 * @param {Date} [ahora] Momento de referencia.
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export function validarSolicitud({ precio, fecha, hora, idRuta }, ahora = new Date()) {
  const texto = String(precio ?? "").trim();
  const valor = Number(texto);
  if (!texto || !Number.isFinite(valor) || valor <= 0) {
    return "Propón un precio en COP mayor que cero.";
  }
  const fechaHora = combinarFechaHora(fecha, hora);
  if (!fechaHora) return "Indica la fecha y la hora del viaje.";
  if (new Date(fechaHora).getTime() < ahora.getTime()) {
    return "La fecha y la hora deben ser futuras.";
  }
  if (!idRuta) return "Selecciona una ruta compatible para enviar la solicitud.";
  return "";
}

/**
 * Texto de calificación a partir del resumen del backend.
 * @param {{promedio?: number|null, total?: number}|null|undefined} resumen Resumen real.
 * @returns {string} «★ 4.5 (3)» o «Sin calificaciones».
 */
export function textoCalificacion(resumen) {
  if (!resumen || resumen.promedio == null || !Number.isFinite(Number(resumen.promedio))) {
    return "Sin calificaciones";
  }
  return `★ ${Number(resumen.promedio).toFixed(1)} (${resumen.total ?? 0})`;
}

/**
 * Describe el vehículo de un viaje con los campos reales disponibles.
 * @param {{tipo_vehiculo?: string, modelo_vehiculo?: string}} viaje Viaje normalizado.
 * @returns {string} Descripción o «Vehículo no especificado».
 */
export function descripcionVehiculo(viaje) {
  const partes = [viaje?.tipo_vehiculo, viaje?.modelo_vehiculo]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return partes.length ? partes.join(" · ") : "Vehículo no especificado";
}

/**
 * Presenta fecha y hora de salida de un viaje.
 * @param {{fecha_salida?: string, hora_salida?: string}} viaje Viaje normalizado.
 * @returns {string} Texto «15 nov 2026, 08:30» o «Sin fecha».
 */
export function fechaHoraSalida(viaje) {
  const fecha = String(viaje?.fecha_salida ?? "").slice(0, 10);
  const hora = String(viaje?.hora_salida ?? "").slice(0, 5);
  if (!fecha) return "Sin fecha";
  const parseada = new Date(`${fecha}T${hora || "00:00"}:00`);
  if (Number.isNaN(parseada.getTime())) return `${fecha} ${hora}`.trim();
  const dia = parseada.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return hora ? `${dia}, ${hora}` : dia;
}

/**
 * Etiqueta de calificación según el estado de la consulta de resumen.
 * @param {{estado?: string, promedio?: number|null, total?: number}|undefined} entrada Estado del resumen.
 * @returns {string} Texto visible, sin puntuaciones ficticias.
 */
export function etiquetaCalificacion(entrada) {
  if (!entrada || entrada.estado === "cargando") return "Calificación…";
  if (entrada.estado === "error") return "Calificación no disponible";
  return textoCalificacion(entrada);
}
