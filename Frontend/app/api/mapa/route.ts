import { NextResponse } from "next/server";

export const runtime = "nodejs";

const TIPOS_GENERICOS = new Set([
  "country",
  "region",
  "subregion",
  "county",
  "joint_municipality",
  "joint_submunicipality",
  "municipality",
  "municipal_district",
  "locality",
  "place",
  "continental_marine",
]);
const URL_MAPTILER = "https://api.maptiler.com/geocoding";
const URL_OSRM = "https://router.project-osrm.org/route/v1/driving";
const CENTRO_VALLEDUPAR = [10.4631, -73.2532] as const;
const CAJA_VALLEDUPAR = [-73.33, 10.38, -73.17, 10.54] as const;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (tipo === "geocodificar") {
    const texto = (searchParams.get("texto") ?? "").trim();
    if (!texto) {
      return NextResponse.json({ error: "Falta el texto a geocodificar." }, { status: 400 });
    }

    const clave = process.env.MAPTILER_API_KEY;
    if (!clave) {
      return NextResponse.json(
        { error: "Falta configurar MAPTILER_API_KEY en el servidor." },
        { status: 500 },
      );
    }

    const parametros = new URLSearchParams({
      key: clave,
      language: "es",
      country: "co",
      limit: "5",
      bbox: CAJA_VALLEDUPAR.join(","),
      proximity: `${CENTRO_VALLEDUPAR[1]},${CENTRO_VALLEDUPAR[0]}`,
    });

    for (const variante of [`${texto}, Valledupar`, texto]) {
      const url = `${URL_MAPTILER}/${encodeURIComponent(variante)}.json?${parametros}`;
      const respuesta = await fetch(url);
      if (!respuesta.ok) {
        return NextResponse.json({ error: "No se pudo buscar la ubicación en el mapa." }, { status: 502 });
      }

      const datos = await respuesta.json();
      const lugares = [] as Array<{ nombre: string; coordenada: [number, number] }>;
      for (const lugar of datos?.features ?? []) {
        const tipos: string[] = lugar?.place_type ?? [];
        if (tipos.some((tipoLugar) => TIPOS_GENERICOS.has(tipoLugar))) continue;
        const [longitud, latitud] = lugar?.center ?? lugar?.geometry?.coordinates ?? [];
        if (Number.isFinite(latitud) && Number.isFinite(longitud)) {
          lugares.push({
            nombre: lugar.place_name_es ?? lugar.place_name ?? texto,
            coordenada: [latitud, longitud],
          });
        }
      }
      if (lugares.length > 0) {
        return NextResponse.json({ lugares });
      }
    }

    return NextResponse.json({ lugares: [] });
  }

  if (tipo === "ruta") {
    const origenTexto = searchParams.get("origen") ?? "";
    const destinoTexto = searchParams.get("destino") ?? "";
    const origen = parseCoordenada(origenTexto);
    const destino = parseCoordenada(destinoTexto);

    if (!origen || !destino) {
      return NextResponse.json({ error: "Coordenadas de origen o destino inválidas." }, { status: 400 });
    }

    const puntos = `${origen[1]},${origen[0]};${destino[1]},${destino[0]}`;
    const respuesta = await fetch(`${URL_OSRM}/${puntos}?overview=full&geometries=geojson`);
    if (!respuesta.ok) {
      return NextResponse.json({ error: "No se pudo calcular la ruta." }, { status: 502 });
    }

    const datos = await respuesta.json();
    const ruta = datos?.routes?.[0];
    if (datos?.code !== "Ok" || !ruta) {
      return NextResponse.json({ error: "No se encontró una ruta entre el origen y el destino." }, { status: 404 });
    }

    return NextResponse.json({
      ruta: {
        trayecto: ruta.geometry.coordinates.map(([longitud, latitud]: [number, number]) => [latitud, longitud] as [number, number]),
        distanciaMetros: ruta.distance,
        duracionSegundos: ruta.duration,
      },
    });
  }

  return NextResponse.json({ error: "Tipo de consulta no soportado." }, { status: 400 });
}

function parseCoordenada(valor: string): [number, number] | null {
  const partes = valor.split(",").map((parte) => Number.parseFloat(parte.trim()));
  if (partes.length !== 2 || partes.some((numero) => !Number.isFinite(numero))) return null;
  const [latitud, longitud] = partes;
  return [latitud, longitud];
}
