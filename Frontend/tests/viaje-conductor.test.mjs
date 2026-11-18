// Pruebas de la cancelación del viaje en curso: como pasajero y como conductor.
import assert from "node:assert/strict";
import { afterEach, before, beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";

// Las rutas usan importaciones sin extensión (resueltas por Next.js); aquí se
// completan con .ts/.js para poder ejecutarlas con node.
registerHooks({
  resolve(especificador, contexto, siguiente) {
    try {
      return siguiente(especificador, contexto);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !/^(\.|next\/)/.test(especificador)) throw error;
      for (const ext of [".ts", ".js", "/index.ts"]) {
        try {
          return siguiente(especificador + ext, contexto);
        } catch {
          // probar la siguiente extensión
        }
      }
      throw error;
    }
  },
});

const SECRETO_PRUEBA = "secreto-de-prueba-no-real-con-longitud-suficiente";
process.env.SESSION_SECRET = SECRETO_PRUEBA;

let cookieSesion = null;
mock.module("next/headers.js", {
  namedExports: {
    cookies: async () => ({
      get: (nombre) => (nombre === "sesion" && cookieSesion ? { value: cookieSesion } : undefined),
    }),
  },
});

let firmarSesion;
let enCursoRoute;

before(async () => {
  ({ firmarSesion } = await import("../src/lib/auth.ts"));
  enCursoRoute = await import("../app/api/viajes/en-curso/route.ts");
});

const originalFetch = globalThis.fetch;
const entornoOriginal = { ...process.env };
let llamadas;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  cookieSesion = null;
  llamadas = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const nombre of ["VITE_API_URL", "INTERNAL_API_KEY"]) {
    if (entornoOriginal[nombre] === undefined) delete process.env[nombre];
    else process.env[nombre] = entornoOriginal[nombre];
  }
});

async function iniciarSesion(id = "7") {
  cookieSesion = await firmarSesion({ id, correo: "ana@unicesar.edu.co", nombre: "Ana Díaz" });
}

function simularBackend(respuesta) {
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    const { status = 200, cuerpo = null } = respuesta;
    return new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status });
  };
}

function peticion(consulta = "") {
  return new Request(`https://cozymov.example/api/viajes/en-curso${consulta}`, { method: "DELETE" });
}

test("cancelar sin sesión responde 401 y no llama al backend", async () => {
  simularBackend({});
  const res = await enCursoRoute.DELETE(peticion("?rol=conductor"));
  assert.equal(res.status, 401);
  assert.equal(llamadas.length, 0);
});

test("el conductor cancela su viaje con el id de la sesión y la clave interna", async () => {
  await iniciarSesion("7");
  simularBackend({ cuerpo: { cancelado: true, id_viaje: 41, solicitudes_reabiertas: 1 } });

  const res = await enCursoRoute.DELETE(peticion("?rol=conductor"));

  assert.equal(res.status, 200);
  assert.equal((await res.json()).cancelado, true);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, "https://backend.example/api/Viajes/viaje-conductor-activo/7");
  assert.equal(llamadas[0].opciones.method, "DELETE");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
});

test("sin ?rol=conductor se sigue cancelando la reserva del pasajero", async () => {
  await iniciarSesion("9");
  simularBackend({ cuerpo: { cancelada: true, id_viaje: 3 } });

  const res = await enCursoRoute.DELETE(peticion());

  assert.equal(res.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/Viajes/reserva-activa/9");
});

test("el id del conductor nunca se toma de la petición", async () => {
  await iniciarSesion("7");
  simularBackend({ cuerpo: { cancelado: true } });

  await enCursoRoute.DELETE(peticion("?rol=conductor&id=999&id_conductor=999"));

  assert.equal(llamadas[0].url, "https://backend.example/api/Viajes/viaje-conductor-activo/7");
});

test("un error de validación del backend llega al navegador", async () => {
  await iniciarSesion("7");
  simularBackend({ status: 404, cuerpo: "No tienes un viaje en curso para cancelar." });

  const res = await enCursoRoute.DELETE(peticion("?rol=conductor"));

  assert.equal(res.status, 404);
  assert.match((await res.json()).error, /viaje en curso/);
});
