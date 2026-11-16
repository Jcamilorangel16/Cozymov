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

process.env.SESSION_SECRET ="secreto-de-prueba-no-real-con-longitud-suficiente";

let cookieSesion = null;
mock.module("next/headers.js", {
  namedExports: {
    cookies: async () => ({
      get: (nombre) => (nombre === "sesion" && cookieSesion ? { value: cookieSesion } : undefined),
    }),
  },
});

let contrasenaRoute;
let vehiculoRoute;
let firmarSesion;

before(async () => {
  ({ firmarSesion } = await import("../src/lib/auth.ts"));
  contrasenaRoute = await import("../app/api/usuario/contrasena/route.ts");
  vehiculoRoute = await import("../app/api/vehiculo/route.ts");
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

function peticion(metodo, cuerpo) {
  return new Request("http://localhost/api/x", {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

// --- Contraseña ---

test("contraseña: exige sesión", async () => {
  simularBackend(() => ({ status: 204 }));
  const res = await contrasenaRoute.POST(peticion("POST", { contrasenaActual: "a", nuevaContrasena: "ClaveNueva2" }));
  assert.equal(res.status, 401);
  assert.equal(llamadas.length, 0);
});

test("contraseña: usa el id de la sesión y la clave interna, ignorando el cuerpo", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ status: 204 }));
  const res = await contrasenaRoute.POST(
    peticion("POST", { idUsuario: 99, contrasenaActual: "ClaveActual1", nuevaContrasena: "ClaveNueva2" }),
  );
  assert.equal(res.status, 204);
  assert.equal(llamadas[0].url, "https://backend.example/api/Usuarios/7/contrasena");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), {
    contrasenaActual: "ClaveActual1",
    nuevaContrasena: "ClaveNueva2",
  });
});

test("contraseña: rechaza nueva contraseña corta o de más de 72 bytes sin llamar al backend", async () => {
  await iniciarSesion();
  simularBackend(() => ({ status: 204 }));
  for (const nueva of ["corta1", "ñ".repeat(37)]) {
    const res = await contrasenaRoute.POST(peticion("POST", { contrasenaActual: "x", nuevaContrasena: nueva }));
    assert.equal(res.status, 400);
  }
  assert.equal(llamadas.length, 0);
});

test("contraseña: contraseña actual incorrecta se informa como 403 con mensaje", async () => {
  await iniciarSesion();
  simularBackend(() => ({ status: 401, cuerpo: { error: "La contraseña actual es incorrecta." } }));
  const res = await contrasenaRoute.POST(
    peticion("POST", { contrasenaActual: "mal", nuevaContrasena: "ClaveNueva2" }),
  );
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /incorrecta/);
});

// --- Vehículo ---

const vehiculoApi = (idUsuario) => ({
  idVehiculo: 5, tipo: "Automovil", modelo: "Mazda 2", capacidad: 3, foto: null, idUsuario,
  automovil: { numeroPuertas: 4 },
});

test("vehículo GET: devuelve null cuando el usuario no tiene vehículo", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: [vehiculoApi(8)] }));
  const res = await vehiculoRoute.GET(new Request("http://localhost/api/vehiculo"));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { vehiculo: null });
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
});

test("vehículo GET: precarga el vehículo propio con su detalle", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: [vehiculoApi(7), vehiculoApi(8)] }));
  const { vehiculo } = await (await vehiculoRoute.GET(new Request("http://localhost/api/vehiculo"))).json();
  assert.equal(vehiculo.modelo, "Mazda 2");
  assert.equal(vehiculo.numero_puertas, 4);
});

const cuerpoPut = { id_vehiculo: 5, tipo: "Automovil", modelo: "Kia", capacidad: 2, numero_puertas: 5, id_usuario: "99" };

test("vehículo PUT: rechaza editar el vehículo de otro usuario", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: vehiculoApi(8) }));
  const res = await vehiculoRoute.PUT(peticion("PUT", cuerpoPut));
  assert.equal(res.status, 403);
  assert.ok(llamadas.every((l) => l.opciones.method !== "PUT"));
});

test("vehículo PUT: edita el vehículo propio sin enviar IdUsuario", async () => {
  await iniciarSesion("7");
  simularBackend((url, opciones) =>
    opciones.method === "PUT" ? { status: 204 } : { cuerpo: vehiculoApi(7) });
  const res = await vehiculoRoute.PUT(peticion("PUT", cuerpoPut));
  assert.equal(res.status, 200);
  const put = llamadas.find((l) => l.opciones.method === "PUT");
  assert.equal(put.url, "https://backend.example/api/vehiculos/5");
  assert.equal(put.opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
  const enviado = JSON.parse(put.opciones.body);
  assert.equal(enviado.Modelo, "Kia");
  assert.equal(enviado.NumeroPuertas, 5);
  assert.equal("IdUsuario" in enviado, false);
});

test("vehículo PUT: exige sesión", async () => {
  simularBackend(() => ({ status: 204 }));
  const res = await vehiculoRoute.PUT(peticion("PUT", cuerpoPut));
  assert.equal(res.status, 401);
});
