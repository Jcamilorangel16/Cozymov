// Utilidades de mapa: geocodificación (MapTiler) y rutas (OSRM) para Valledupar.

export type Coordenada = [number, number]; // [latitud, longitud]

export type LugarMapa = {
  nombre: string;
  coordenada: Coordenada;
};

export type RutaOsrm = {
  trayecto: Coordenada[];
  distanciaMetros: number;
  duracionSegundos: number;
};

/** Centro de Valledupar y caja [oeste, sur, este, norte] usada para acotar las búsquedas. */
export const CENTRO_VALLEDUPAR: Coordenada = [10.4631, -73.2532];
const CAJA_VALLEDUPAR = [-73.33, 10.38, -73.17, 10.54];

const TIPOS_GENERICOS = new Set([
  "country", "region", "subregion", "county", "joint_municipality", "joint_submunicipality",
  "municipality", "municipal_district", "locality", "place", "continental_marine",
]);
const URL_MAPTILER = "https://api.maptiler.com/geocoding";
const URL_OSRM = "https://router.project-osrm.org/route/v1/driving";

/**
 * Busca direcciones y barrios de Valledupar con la geocodificación de MapTiler.
 * La clave real se mantiene en el servidor; el navegador solo consulta un proxy interno.
 * @param texto Barrio o dirección escritos por el usuario.
 * @param senal Señal opcional para cancelar la petición.
 * @returns Lugares encontrados (vacío si no hay coincidencias).
 */
export async function buscarMapTiler(texto: string, senal?: AbortSignal): Promise<LugarMapa[]> {
  const consulta = texto.trim();
  if (!consulta) return [];

  const respuesta = await fetch(`/api/mapa?tipo=geocodificar&texto=${encodeURIComponent(consulta)}`, { signal: senal });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(datos.error || "No se pudo buscar la ubicación en el mapa.");
  }

  const datos = await respuesta.json();
  return (datos.lugares ?? []) as LugarMapa[];
}

/**
 * Calcula la ruta en carro entre dos puntos con el servidor público de OSRM.
 * La llamada se reenvía a un endpoint del servidor para no exponer la lógica de mapa en el navegador.
 * @param origen Punto de partida.
 * @param destino Punto de llegada.
 * @param senal Señal opcional para cancelar la petición.
 * @returns Trayecto como lista de coordenadas, distancia y duración.
 */
export async function calcularRutaOsrm(
  origen: Coordenada,
  destino: Coordenada,
  senal?: AbortSignal,
): Promise<RutaOsrm> {
  const params = new URLSearchParams({
    tipo: "ruta",
    origen: `${origen[0]},${origen[1]}`,
    destino: `${destino[0]},${destino[1]}`,
  });
  const respuesta = await fetch(`/api/mapa?${params.toString()}`, { signal: senal });
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => ({}));
    throw new Error(datos.error || "No se pudo calcular la ruta.");
  }

  const datos = await respuesta.json();
  return datos.ruta as RutaOsrm;
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const radio = 6371000;
  const aRad = (grados: number) => (grados * Math.PI) / 180;
  const dLat = aRad(b[0] - a[0]);
  const dLng = aRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aRad(a[0])) * Math.cos(aRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * radio * Math.asin(Math.sqrt(h));
}

/** Índice del punto del trayecto más cercano a la posición dada (-1 si no hay trayecto). */
export function indicePuntoCercano(trayecto: Coordenada[], posicion: Coordenada): number {
  let mejor = -1;
  let menor = Infinity;
  trayecto.forEach((punto, indice) => {
    const distancia = distanciaMetros(punto, posicion);
    if (distancia < menor) {
      menor = distancia;
      mejor = indice;
    }
  });
  return mejor;
}

/** Ubicación de la Universidad Popular del Cesar; debe coincidir con scripts/precargar-rutas.mjs. */
export const UNIVERSIDAD_COORDENADA: Coordenada = [10.4491234, -73.2625229];

/** Misma normalización que usa el script de precarga para nombrar los archivos de public/rutas. */
export function slugBarrio(texto: string): string {
  return texto
    .replace(/\s+/g, " ")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Decodifica una polilínea codificada (precisión 5, formato de OSRM/Google) a [lat, lng]. */
export function decodificarPolilinea(codificada: string): Coordenada[] {
  const puntos: Coordenada[] = [];
  let indice = 0;
  let lat = 0;
  let lng = 0;
  const leerValor = () => {
    let resultado = 0;
    let desplazamiento = 0;
    let byte: number;
    do {
      byte = codificada.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << desplazamiento;
      desplazamiento += 5;
    } while (byte >= 0x20);
    return resultado & 1 ? ~(resultado >> 1) : resultado >> 1;
  };
  while (indice < codificada.length) {
    lat += leerValor();
    lng += leerValor();
    puntos.push([lat / 1e5, lng / 1e5]);
  }
  return puntos;
}

type TramoPrecargado = { p: string; d: number; t: number };

/**
 * Busca la ruta precalculada entre un barrio y la universidad (en cualquiera de los dos sentidos).
 * Solo descarga el archivo del barrio consultado (public/rutas/<barrio>.json).
 * @returns La ruta o `null` si el trayecto no involucra a la universidad o el barrio no está precargado.
 */
export async function obtenerRutaPrecargada(
  origen: string,
  destino: string,
  senal?: AbortSignal,
): Promise<(RutaOsrm & { origen: Coordenada; destino: Coordenada }) | null> {
  const idUniversidad = slugBarrio(UNIVERSIDAD_NOMBRE);
  const idOrigen = slugBarrio(origen);
  const idDestino = slugBarrio(destino);
  const haciaUniversidad = idDestino === idUniversidad;
  const idBarrio = haciaUniversidad ? idOrigen : idDestino;
  if (!haciaUniversidad && idOrigen !== idUniversidad) return null;
  if (!idBarrio || idBarrio === idUniversidad) return null;

  const respuesta = await fetch(`/rutas/${idBarrio}.json`, { signal: senal });
  if (!respuesta.ok) return null;
  const datos: { origen: Coordenada; ida: TramoPrecargado; vuelta: TramoPrecargado } = await respuesta.json();
  const tramo = haciaUniversidad ? datos.ida : datos.vuelta;
  return {
    trayecto: decodificarPolilinea(tramo.p),
    distanciaMetros: tramo.d,
    duracionSegundos: tramo.t,
    origen: haciaUniversidad ? datos.origen : UNIVERSIDAD_COORDENADA,
    destino: haciaUniversidad ? UNIVERSIDAD_COORDENADA : datos.origen,
  };
}

const UNIVERSIDAD_NOMBRE = "Universidad Popular Del Cesar";
