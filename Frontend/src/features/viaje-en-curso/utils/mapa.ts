export type Coordenadas = [latitud: number, longitud: number];
export type LimitesMapa = [esquinaSuroeste: Coordenadas, esquinaNoreste: Coordenadas];

export type SugerenciaUbicacion = {
  id: string;
  nombre: string;
  coordenadas: Coordenadas;
};

export type RutaCalculada = {
  coordenadas: Coordenadas[];
  distancia: number;
  duracion: number;
};

type FeatureMapTiler = {
  id?: unknown;
  place_name?: unknown;
  text?: unknown;
  center?: unknown;
  place_type?: unknown;
};

function esCoordenada(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export async function buscarMapTiler(
  texto: string,
  {
    apiKey,
    tipos,
    proximidad,
    limites,
    signal,
    autocomplete = true,
  }: {
    apiKey: string;
    tipos: string;
    proximidad?: Coordenadas | null;
    limites?: LimitesMapa | null;
    signal: AbortSignal;
    autocomplete?: boolean;
  }
): Promise<FeatureMapTiler[]> {
  const parametros = new URLSearchParams({
    key: apiKey,
    limit: "10",
    language: "es",
    country: "co",
    types: tipos,
    autocomplete: String(autocomplete),
  });
  if (proximidad) {
    parametros.set("proximity", `${proximidad[1]},${proximidad[0]}`);
  }
  if (limites) {
    const [[sur, oeste], [norte, este]] = limites;
    parametros.set("bbox", `${oeste},${sur},${este},${norte}`);
  }

  const respuesta = await fetch(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(texto)}.json?${parametros}`,
    { signal }
  );
  if (!respuesta.ok) {
    throw new Error("No se pudieron buscar ubicaciones en MapTiler.");
  }

  const resultado: unknown = await respuesta.json();
  if (
    !resultado ||
    typeof resultado !== "object" ||
    !("features" in resultado) ||
    !Array.isArray(resultado.features)
  ) {
    return [];
  }
  return resultado.features as FeatureMapTiler[];
}

export async function buscarDireccionInversa(
  punto: Coordenadas,
  tipos: string,
  apiKey: string,
  signal: AbortSignal
): Promise<FeatureMapTiler[]> {
  const [latitud, longitud] = punto;
  const parametros = new URLSearchParams({
    key: apiKey,
    limit: "5",
    language: "es",
    country: "co",
    types: tipos,
  });
  const respuesta = await fetch(
    `https://api.maptiler.com/geocoding/${longitud},${latitud}.json?${parametros}`,
    { signal }
  );
  if (!respuesta.ok) {
    throw new Error("MapTiler no pudo identificar la dirección.");
  }

  const resultado: unknown = await respuesta.json();
  if (
    !resultado ||
    typeof resultado !== "object" ||
    !("features" in resultado) ||
    !Array.isArray(resultado.features)
  ) {
    return [];
  }
  return resultado.features as FeatureMapTiler[];
}

export function convertirEnSugerencia(
  feature: FeatureMapTiler,
  limites: LimitesMapa
): SugerenciaUbicacion | null {
  const nombre = feature.place_name || feature.text;
  const centro = feature.center;
  const tipos = feature.place_type;
  const tiposPermitidos = new Set([
    "address",
    "street",
    "poi",
    "neighborhood",
    "place",
    "locality",
  ]);
  if (
    typeof nombre !== "string" ||
    !Array.isArray(centro) ||
    centro.length < 2 ||
    !centro.every(esCoordenada) ||
    !Array.isArray(tipos) ||
    !tipos.some((tipo) => typeof tipo === "string" && tiposPermitidos.has(tipo))
  ) {
    return null;
  }

  const [longitud, latitud] = centro;
  const [[sur, oeste], [norte, este]] = limites;
  if (latitud < sur || latitud > norte || longitud < oeste || longitud > este) {
    return null;
  }

  return {
    id: typeof feature.id === "string" ? feature.id : nombre,
    nombre,
    coordenadas: [latitud, longitud],
  };
}

export function obtenerNombreDireccion(feature: FeatureMapTiler): string {
  const nombre = feature.place_name || feature.text;
  return typeof nombre === "string" ? nombre : "";
}

export async function calcularRutaOsrm(
  origen: Coordenadas,
  destino: Coordenadas,
  signal: AbortSignal
): Promise<RutaCalculada> {
  const puntos = `${origen[1]},${origen[0]};${destino[1]},${destino[0]}`;
  const parametros = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const respuesta = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${puntos}?${parametros}`,
    { signal }
  );
  if (!respuesta.ok) {
    throw new Error("No se pudo conectar con el servicio de rutas.");
  }

  const resultado: unknown = await respuesta.json();
  if (!resultado || typeof resultado !== "object") {
    throw new Error("El servicio de rutas devolvió una respuesta inválida.");
  }
  const rutas = "routes" in resultado ? resultado.routes : null;
  const ruta = Array.isArray(rutas) ? rutas[0] : null;
  if (!ruta || typeof ruta !== "object") {
    throw new Error("No se encontró una ruta vial entre los puntos seleccionados.");
  }

  const geometry = "geometry" in ruta ? ruta.geometry : null;
  const coords =
    geometry && typeof geometry === "object" && "coordinates" in geometry
      ? geometry.coordinates
      : null;
  const distancia = "distance" in ruta ? ruta.distance : null;
  const duracion = "duration" in ruta ? ruta.duration : null;
  if (
    !Array.isArray(coords) ||
    !coords.length ||
    !coords.every(
      (coordinate) =>
        Array.isArray(coordinate) &&
        coordinate.length >= 2 &&
        esCoordenada(coordinate[0]) &&
        esCoordenada(coordinate[1])
    ) ||
    !esCoordenada(distancia) ||
    !esCoordenada(duracion)
  ) {
    throw new Error("No se encontró una ruta vial entre los puntos seleccionados.");
  }

  return {
    coordenadas: coords.map(([longitud, latitud]) => [latitud, longitud]),
    distancia,
    duracion,
  };
}
