// Contiene las consultas y utilidades de presentación de viajes buscados.

/**
 * Consulta los viajes activos de la API usando los filtros recibidos.
 * @param {{origen?: string, destino?: string, fecha?: string}} filtros Criterios de búsqueda.
 * @param {AbortSignal} [signal] Señal opcional para cancelar la consulta.
 * @returns {Promise<Array>} Viajes recibidos desde el servidor.
 */
export async function consultarViajes(filtros, signal) {
  const parametros = new URLSearchParams();
  if (filtros.origen) parametros.set("origen", filtros.origen);
  if (filtros.destino) parametros.set("destino", filtros.destino);
  if (filtros.fecha) parametros.set("fecha", filtros.fecha);

  const respuesta = await fetch(`/api/viajes?${parametros.toString()}`, { signal });
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(resultado.error || "No se pudieron consultar los viajes.");
  }
  if (!Array.isArray(resultado.viajes)) {
    throw new Error("La respuesta del servidor no contiene una lista de viajes.");
  }

  return resultado.viajes;
}

/**
 * Normaliza texto para comparar ubicaciones sin diferencias de acentos.
 * @param {unknown} valor Texto de origen o destino.
 * @returns {string} Texto normalizado.
 */
function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Calcula la distancia de edición entre dos textos.
 * @param {string} textoA Primer texto normalizado.
 * @param {string} textoB Segundo texto normalizado.
 * @returns {number} Cantidad mínima de ediciones necesarias.
 */
function calcularDistancia(textoA, textoB) {
  const anterior = Array.from({ length: textoB.length + 1 }, (_, indice) => indice);

  for (let indiceA = 1; indiceA <= textoA.length; indiceA += 1) {
    let diagonal = anterior[0];
    anterior[0] = indiceA;

    for (let indiceB = 1; indiceB <= textoB.length; indiceB += 1) {
      const arriba = anterior[indiceB];
      const costo = textoA[indiceA - 1] === textoB[indiceB - 1] ? 0 : 1;
      anterior[indiceB] = Math.min(
        anterior[indiceB] + 1,
        anterior[indiceB - 1] + 1,
        diagonal + costo,
      );
      diagonal = arriba;
    }
  }

  return anterior[textoB.length];
}

/**
 * Calcula la similitud entre una consulta y un valor de ruta.
 * @param {string} consulta Texto ingresado en el filtro.
 * @param {string} valor Origen o destino de un viaje.
 * @returns {number} Puntaje de similitud entre cero y uno.
 */
function calcularSimilitud(consulta, valor) {
  const textoConsulta = normalizarTexto(consulta);
  const textoValor = normalizarTexto(valor);
  if (!textoConsulta || !textoValor) return 0;
  if (textoConsulta === textoValor) return 1;
  if (textoValor.includes(textoConsulta)) {
    return 0.8 + (textoConsulta.length / textoValor.length) * 0.2;
  }

  const candidatos = [textoValor, ...textoValor.split(" ")];
  return Math.max(
    ...candidatos.map((candidato) => {
      const longitud = Math.max(textoConsulta.length, candidato.length);
      return longitud ? 1 - calcularDistancia(textoConsulta, candidato) / longitud : 0;
    }),
  );
}

/**
 * Calcula la relevancia de un viaje frente a los filtros activos.
 * @param {object} viaje Registro del viaje.
 * @param {{origen?: string, destino?: string, fecha?: string}} filtros Criterios de búsqueda.
 * @returns {number} Puntaje combinado de ruta y fecha.
 */
function puntajeViaje(viaje, filtros) {
  const puntajesTexto = [];
  if (filtros.origen) {
    puntajesTexto.push(calcularSimilitud(filtros.origen, viaje.origen));
  }
  if (filtros.destino) {
    puntajesTexto.push(calcularSimilitud(filtros.destino, viaje.destino));
  }

  const puntajeRuta = puntajesTexto.length
    ? puntajesTexto.reduce((total, puntaje) => total + puntaje, 0) / puntajesTexto.length
    : 0;
  const puntajeFecha =
    filtros.fecha && String(viaje.fecha_salida).slice(0, 10) === filtros.fecha ? 1 : 0;

  if (filtros.fecha && puntajesTexto.length) {
    return puntajeRuta * 0.8 + puntajeFecha * 0.2;
  }
  return filtros.fecha ? puntajeFecha : puntajeRuta;
}

/**
 * Ordena los resultados por similitud de origen, destino y fecha.
 * @param {Array} viajes Lista de viajes disponibles.
 * @param {{origen: string, destino: string, fecha: string}} filtros Criterios activos.
 * @returns {Array} Lista ordenada de manera estable por relevancia.
 */
export function ordenarViajesPorSimilitud(viajes, filtros) {
  return viajes
    .map((viaje, indice) => ({ viaje, indice, puntaje: puntajeViaje(viaje, filtros) }))
    .sort((a, b) => b.puntaje - a.puntaje || a.indice - b.indice)
    .map(({ viaje }) => viaje);
}

/**
 * Formatea un precio como moneda colombiana.
 * @param {number|string} precio Valor del pasaje.
 * @returns {string} Precio con formato COP.
 */
export function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(precio));
}

/**
 * Presenta una fecha de salida en el formato local de Colombia.
 * @param {string|Date} fecha Fecha recibida desde la API.
 * @returns {string} Fecha formateada o su valor original si no es válida.
 */
export function formatearFecha(fecha) {
  const valor = String(fecha || "").slice(0, 10);
  const fechaLocal = new Date(`${valor}T00:00:00`);
  return Number.isNaN(fechaLocal.getTime())
    ? valor
    : fechaLocal.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}
