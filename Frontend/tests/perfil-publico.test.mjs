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

process.env.SESSION_SECRET = "secreto-de-prueba-no-real-con-longitud-suficiente";

let cookieSesion = null;
mock.module("next/headers.js", {
  namedExports: {
    cookies: async () => ({
      get: (nombre) => (nombre === "sesion" && cookieSesion ? { value: cookieSesion } : undefined),
    }),
  },
});

const FOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

let perfilRoute;
let firmarSesion;
let utilidades;

before(async () => {
  ({ firmarSesion } = await import("../src/lib/auth.ts"));
  perfilRoute = await import("../app/api/perfil/route.ts");
  utilidades = await import("../src/features/perfil-publico/utils/perfil.js");
});

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.VITE_API_URL;
const originalInternalApiKey = process.env.INTERNAL_API_KEY;
let llamadas;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
  cookieSesion = null;
  llamadas = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = originalApiUrl;
  if (originalInternalApiKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = originalInternalApiKey;
});

async function iniciarSesion(id = "7") {
  cookieSesion = await firmarSesion({ id, correo: "ana@unicesar.edu.co" });
}

function simularBackend(manejador) {
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    const { status = 200, cuerpo = null } = manejador(String(url), opciones);
    return new Response(cuerpo === null ? null : JSON.stringify(cuerpo), { status });
  };
}

function put(cuerpo) {
  return new Request("http://localhost/api/perfil", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

test("perfil: GET exige sesión", async () => {
  simularBackend(() => ({ cuerpo: {} }));
  const res = await perfilRoute.GET(new Request("http://localhost/api/perfil?id=3"));
  assert.equal(res.status, 401);
  assert.equal(llamadas.length, 0);
});

test("perfil: GET ?id consulta el perfil público de otro usuario con la clave interna", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: { idUsuario: 3, nombre: "Luis Pérez", resenas: [] } }));
  const res = await perfilRoute.GET(new Request("http://localhost/api/perfil?id=3"));
  assert.equal(res.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/perfiles/3");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.equal((await res.json()).nombre, "Luis Pérez");
});

test("perfil: GET sin id devuelve el propio y rechaza ids no válidos", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: { idUsuario: 7 } }));
  await perfilRoute.GET(new Request("http://localhost/api/perfil"));
  assert.equal(llamadas[0].url, "https://backend.example/api/perfiles/7");

  for (const id of ["0", "-1", "abc", "1/../2"]) {
    const res = await perfilRoute.GET(new Request(`http://localhost/api/perfil?id=${encodeURIComponent(id)}`));
    assert.equal(res.status, 400);
  }
  assert.equal(llamadas.length, 1);
});

test("perfil: PUT edita solo el perfil de la sesión y solo los campos admitidos", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ status: 204 }));
  const res = await perfilRoute.PUT(
    put({ idUsuario: 99, descripcion: "  Hola  ", fotoPerfil: FOTO, cedula: "123" }),
  );
  assert.equal(res.status, 204);
  assert.equal(llamadas[0].url, "https://backend.example/api/perfiles/7");
  assert.equal(llamadas[0].opciones.method, "PUT");
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { descripcion: "Hola", fotoPerfil: FOTO });
});

test("perfil: PUT rechaza fotos externas, SVG y descripciones largas sin llamar al backend", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ status: 204 }));
  for (const cuerpo of [
    { fotoPerfil: "https://ejemplo.com/a.png" },
    { fotoPerfil: "data:image/svg+xml;base64,PHN2Zz4=" },
    { fotoPerfil: "data:image/jpeg;base64," + "A".repeat(utilidades.MAX_LONGITUD_FOTO) },
    { descripcion: "x".repeat(utilidades.MAX_DESCRIPCION + 1) },
    { descripcion: 5 },
  ]) {
    const res = await perfilRoute.PUT(put(cuerpo));
    assert.equal(res.status, 400, JSON.stringify(cuerpo).slice(0, 60));
  }
  assert.equal(llamadas.length, 0);
});

test("perfil: utilidades de presentación", () => {
  assert.equal(utilidades.esFotoMostrable(FOTO), true);
  assert.equal(utilidades.esFotoMostrable("https://ejemplo.com/a.png"), false);
  assert.equal(utilidades.esFotoMostrable(null), false);
  assert.equal(utilidades.inicialNombre(" ana"), "A");
  assert.equal(utilidades.inicialNombre(""), "?");
  assert.equal(utilidades.estrellasLlenas(4.5), 5);
  assert.equal(utilidades.estrellasLlenas(3.4), 3);
  assert.equal(utilidades.estrellasLlenas(null), 0);
  assert.match(utilidades.formatearMiembroDesde("2026-11-15T12:00:00Z"), /^Miembro desde noviembre de 2026$/);
  assert.equal(utilidades.formatearMiembroDesde("no-fecha"), "");
});
