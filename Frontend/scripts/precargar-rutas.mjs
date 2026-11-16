// Precalcula las rutas barrio ⇄ Universidad Popular del Cesar y las guarda en public/rutas/.
// Uso (desde Frontend/):  node scripts/precargar-rutas.mjs   (solo calcula las que faltan; --todo recalcula todas)
// Las coordenadas de los barrios vienen de scripts/barrios-coordenadas.json (Google Maps) y OSRM calcula el trayecto.
// El resultado se versiona; solo hay que volver a ejecutarlo si cambia el catálogo de barrios.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import barrios from "../src/features/ofrecer-viajes/constants/barriosRutaCotidiana.js";

const UNIVERSIDAD = [10.4491234, -73.2625229]; // [lat, lng]; debe coincidir con src/lib/mapa.ts
const SALIDA = path.resolve("public/rutas");
const MANUAL = path.resolve("scripts/barrios-coordenadas.json"); // { "NOMBRE BARRIO": [lat, lng] } verificadas a mano
const AGENTE = "cozymov-precarga-rutas/1.0";
const RECALCULAR = process.argv.includes("--todo");

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
export const limpiar = (texto) => texto.replace(/\s+/g, " ").trim();
export const slug = (texto) =>
  limpiar(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function pedirJson(url, intentos = 4) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": AGENTE } });
      if (r.ok) return await r.json();
    } catch { /* reintenta */ }
    await esperar(2000 * (i + 1));
  }
  return null;
}

async function rutaOsrm(desde, hasta) {
  const pts = `${desde[1]},${desde[0]};${hasta[1]},${hasta[0]}`;
  const datos = await pedirJson(`https://router.project-osrm.org/route/v1/driving/${pts}?overview=full&geometries=polyline`);
  const ruta = datos?.routes?.[0];
  if (datos?.code !== "Ok" || !ruta) return null;
  return { p: ruta.geometry, d: Math.round(ruta.distance), t: Math.round(ruta.duration) };
}

async function main() {
  await mkdir(SALIDA, { recursive: true });
  const cache = {};
  const manual = existsSync(MANUAL) ? JSON.parse(await readFile(MANUAL, "utf8")) : {};
  for (const [nombre, [lat, lng]] of Object.entries(manual)) cache[slug(nombre)] = { lat, lng, fuente: "manual" };
  const lista = [...new Set(barrios.map(limpiar))];
  const sinUbicar = [];
  let hechos = 0;

  for (const barrio of lista) {
    const id = slug(barrio);
    const punto = cache[id];
    if (!punto) { sinUbicar.push(barrio); console.log(`SIN COORDENADAS  ${barrio}`); continue; }

    const origen = [punto.lat, punto.lng];
    const archivo = path.join(SALIDA, `${id}.json`);
    // Si la ruta ya está guardada con las mismas coordenadas no se vuelve a pedir a OSRM (--todo la recalcula).
    if (!RECALCULAR && existsSync(archivo)) {
      const previo = JSON.parse(await readFile(archivo, "utf8"));
      if (previo.origen?.[0] === origen[0] && previo.origen?.[1] === origen[1]) { hechos++; continue; }
    }

    const ida = await rutaOsrm(origen, UNIVERSIDAD);
    const vuelta = await rutaOsrm(UNIVERSIDAD, origen);
    await esperar(250);
    if (!ida || !vuelta) { sinUbicar.push(barrio); console.log(`SIN RUTA    ${barrio}`); continue; }

    await writeFile(archivo, JSON.stringify({ barrio, origen, ida, vuelta }));
    hechos++;
    console.log(`OK ${hechos}  ${barrio}  (${(ida.d / 1000).toFixed(1)} km)`);
  }

  await writeFile(path.resolve("scripts/barrios-sin-ruta.json"), JSON.stringify(sinUbicar, null, 2));
  console.log(`\nListo: ${hechos} barrios precargados, ${sinUbicar.length} sin ubicar.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
