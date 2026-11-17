import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../src/lib/auth";

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
const MAXIMO_TEXTO = 120;
const ESPERA_MS = 8000;

export async function GET(request: Request) {
  // Sin sesión, cualquiera en internet podría gastar la cuota de MapTiler y
  // usar este servidor como intermediario hacia servicios externos.
  const sesion = await obtenerSesionActual();
  if (!sesion) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }

  try {
    return await consultarMapa(request);
  } catch (error) {
    console.error("No se pudo consultar el servicio de mapas:", error);
    return NextResponse.json(
      { error: "El servicio de mapas no respondió. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}

async function consultarMapa(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get("tipo");

  if (tipo === "geocodificar") {
    const texto = (searchParams.get("texto") ?? "").trim();
    if (!texto) {
      return NextResponse.json({ error: "Falta el texto a geocodificar." }, { status: 400 });
    }
    if (texto.length > MAXIMO_TEXTO) {
      return NextResponse.json({ error: "El texto a buscar es demasiado largo." }, { status: 400 });
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
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(ESPERA_MS) });
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
    const respuesta = await fetch(`${URL_OSRM}/${puntos}?overview=full&geometries=geojson`, {
      signal: AbortSignal.timeout(ESPERA_MS),
    });
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
  // Solo dos números decimales: nada de lo que llegue aquí debe poder alterar
  // la URL que se arma para el servicio de rutas.
  const textos = valor.split(",").map((parte) => parte.trim());
  if (textos.length !== 2 || textos.some((texto) => !/^-?\d{1,3}(\.\d{1,20})?$/.test(texto))) {
    return null;
  }
  const [latitud, longitud] = textos.map(Number);
  if (Math.abs(latitud) > 90 || Math.abs(longitud) > 180) return null;
  return [latitud, longitud];
}
