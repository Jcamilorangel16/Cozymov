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

let NextRequest;
let proxy;
let firmarSesion;
let verificarSesion;
let chatsRoute;
let contactosRoute;
let mensajesRoute;
let mapaRoute;
let loginRoute;
let vehiculoRoute;

before(async () => {
  ({ NextRequest } = await import("next/server.js"));
  ({ proxy } = await import("../proxy.ts"));
  ({ firmarSesion, verificarSesion } = await import("../src/lib/auth.ts"));
  chatsRoute = await import("../app/api/mensajes/chats/route.ts");
  contactosRoute = await import("../app/api/mensajes/contactos/route.ts");
  mensajesRoute = await import("../app/api/mensajes/route.ts");
  mapaRoute = await import("../app/api/mapa/route.ts");
  loginRoute = await import("../app/api/login/route.ts");
  vehiculoRoute = await import("../app/api/vehiculo/route.ts");
});

const originalFetch = globalThis.fetch;
const entornoOriginal = { ...process.env };
const errorOriginal = console.error;
let llamadas;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  process.env.MAPTILER_API_KEY = "clave-mapa-prueba";
  delete process.env.ORIGENES_PERMITIDOS;
  cookieSesion = null;
  llamadas = [];
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = errorOriginal;
  for (const nombre of ["VITE_API_URL", "INTERNAL_API_KEY", "MAPTILER_API_KEY", "ORIGENES_PERMITIDOS"]) {
    if (entornoOriginal[nombre] === undefined) delete process.env[nombre];
    else process.env[nombre] = entornoOriginal[nombre];
  }
});

async function iniciarSesion(id = "7") {
  cookieSesion = await firmarSesion({ id, correo: "ana@unicesar.edu.co", nombre: "Ana Díaz" });
}

/** Sustituye fetch por un backend simulado; `cuerpo` puede ser texto o un valor JSON. */
function simularBackend(manejador) {
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    const { status = 200, cuerpo = null } = manejador(String(url), opciones);
    const contenido = cuerpo === null || typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
    return new Response(contenido, { status });
  };
}

// --- Protección CSRF (proxy.ts) ---

function solicitudApi(metodo, cabeceras = {}) {
  return new NextRequest("https://cozymov.example/api/viajes", {
    method: metodo,
    headers: { host: "cozymov.example", ...cabeceras },
  });
}

test("csrf: acepta un POST hecho desde la propia aplicación", () => {
  const res = proxy(solicitudApi("POST", { origin: "https://cozymov.example" }));
  assert.notEqual(res.status, 403);
});

test("csrf: rechaza un POST que llega desde otro sitio", async () => {
  const res = proxy(solicitudApi("POST", { origin: "https://sitio-malicioso.example" }));
  assert.equal(res.status, 403);
  assert.match((await res.json()).error, /origen/);
});

test("csrf: rechaza también PUT y DELETE de otro sitio y el origen nulo", () => {
  assert.equal(proxy(solicitudApi("PUT", { origin: "https://otro.example" })).status, 403);
  assert.equal(proxy(solicitudApi("DELETE", { origin: "https://otro.example" })).status, 403);
  assert.equal(proxy(solicitudApi("POST", { origin: "null" })).status, 403);
});

test("csrf: un subdominio hermano no cuenta como la propia aplicación", () => {
  const res = proxy(solicitudApi("POST", { origin: "https://otra.cozymov.example" }));
  assert.equal(res.status, 403);
});

test("csrf: no interfiere con las lecturas ni con clientes sin Origin", () => {
  assert.notEqual(proxy(solicitudApi("GET", { origin: "https://otro.example" })).status, 403);
  assert.notEqual(proxy(solicitudApi("POST")).status, 403);
});

test("csrf: sin Origin, respeta la señal cross-site del navegador", () => {
  const res = proxy(solicitudApi("POST", { "sec-fetch-site": "cross-site" }));
  assert.equal(res.status, 403);
});

test("csrf: admite los orígenes declarados en ORIGENES_PERMITIDOS", () => {
  process.env.ORIGENES_PERMITIDOS = "https://app.cozymov.co/, https://otra.example";
  assert.notEqual(proxy(solicitudApi("POST", { origin: "https://app.cozymov.co" })).status, 403);
  assert.equal(proxy(solicitudApi("POST", { origin: "https://no-listado.example" })).status, 403);
});

// --- Sesión ---

test("sesión: rechaza firmar con un SESSION_SECRET corto", async () => {
  process.env.SESSION_SECRET = "corto";
  await assert.rejects(
    firmarSesion({ id: "7", correo: "ana@unicesar.edu.co" }),
    /al menos 32 caracteres/,
  );
});

test("sesión: no acepta un token firmado con otro secreto ni uno sin firma", async () => {
  const token = await firmarSesion({ id: "7", correo: "ana@unicesar.edu.co" });
  assert.equal((await verificarSesion(token))?.id, "7");

  process.env.SESSION_SECRET = "otro-secreto-de-prueba-igual-de-largo-pero-distinto";
  assert.equal(await verificarSesion(token), null);

  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  const codificar = (valor) => Buffer.from(JSON.stringify(valor)).toString("base64url");
  const sinFirma = `${codificar({ alg: "none" })}.${codificar({ sub: "1", correo: "x@y.co" })}.`;
  assert.equal(await verificarSesion(sinFirma), null);
});

// --- Mensajes: el backend exige la clave interna ---

test("mensajes: la lista de chats envía la clave interna", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: [] }));
  const res = await chatsRoute.GET();
  assert.equal(res.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/Mensajes/chats?yo=7");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
});

test("mensajes: los contactos envían la clave interna", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: [] }));
  const res = await contactosRoute.GET(new Request("http://localhost/api/mensajes/contactos?q=ana"));
  assert.equal(res.status, 200);
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
});

test("mensajes: leer y enviar usan la clave interna y el usuario de la sesión", async () => {
  await iniciarSesion("7");
  const mensaje = {
    idMensaje: 1, idEmisor: 7, idReceptor: 9, contenido: "Hola", fechaHora: "2026-11-16T10:00:00", leido: false,
  };
  simularBackend((_url, opciones) =>
    opciones.method === "POST" ? { status: 201, cuerpo: mensaje } : { cuerpo: [mensaje] });

  const lectura = await mensajesRoute.GET(
    new Request("http://localhost/api/mensajes?usuario1=7&usuario2=9"),
  );
  assert.equal(lectura.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/Mensajes/conversacion?yo=7&otro=9");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");

  const envio = await mensajesRoute.POST(
    new Request("http://localhost/api/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_emisor: "7", id_receptor: "9", contenido: "Hola" }),
    }),
  );
  assert.equal(envio.status, 201);
  assert.equal(llamadas[1].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.equal(JSON.parse(llamadas[1].opciones.body).IdEmisor, 7);
});

test("mensajes: no deja leer la conversación de otro usuario", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ cuerpo: [] }));
  const res = await mensajesRoute.GET(
    new Request("http://localhost/api/mensajes?usuario1=8&usuario2=9"),
  );
  assert.equal(res.status, 403);
  assert.equal(llamadas.length, 0);
});

test("mensajes: sin clave interna configurada no llama al backend", async () => {
  await iniciarSesion("7");
  delete process.env.INTERNAL_API_KEY;
  simularBackend(() => ({ cuerpo: [] }));
  const res = await chatsRoute.GET();
  assert.equal(res.status, 500);
  assert.equal(llamadas.length, 0);
});

// --- Mapa ---

test("mapa: exige sesión antes de consultar servicios externos", async () => {
  simularBackend(() => ({ cuerpo: { features: [] } }));
  const res = await mapaRoute.GET(new Request("http://localhost/api/mapa?tipo=geocodificar&texto=Centro"));
  assert.equal(res.status, 401);
  assert.equal(llamadas.length, 0);
});

test("mapa: rechaza coordenadas que no son números y textos enormes", async () => {
  await iniciarSesion();
  simularBackend(() => ({ cuerpo: {} }));

  for (const origen of ["10.4,-73.2;8.8.8.8", "10.4,-73.2?x=1", "abc,def", "91,0", "10.4"]) {
    const res = await mapaRoute.GET(
      new Request(`http://localhost/api/mapa?tipo=ruta&origen=${encodeURIComponent(origen)}&destino=10.44,-73.26`),
    );
    assert.equal(res.status, 400, origen);
  }

  const largo = await mapaRoute.GET(
    new Request(`http://localhost/api/mapa?tipo=geocodificar&texto=${"a".repeat(121)}`),
  );
  assert.equal(largo.status, 400);
  assert.equal(llamadas.length, 0);
});

test("mapa: con sesión calcula la ruta y responde 502 si el servicio falla", async () => {
  await iniciarSesion();
  simularBackend(() => ({
    cuerpo: {
      code: "Ok",
      routes: [{ geometry: { coordinates: [[-73.25, 10.46], [-73.26, 10.45]] }, distance: 1500, duration: 240 }],
    },
  }));
  const res = await mapaRoute.GET(
    new Request("http://localhost/api/mapa?tipo=ruta&origen=10.4631,-73.2532&destino=10.4491234,-73.2625229"),
  );
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).ruta.trayecto[0], [10.46, -73.25]);
  assert.match(llamadas[0].url, /-73\.2532,10\.4631;-73\.2625229,10\.4491234/);

  globalThis.fetch = async () => {
    throw new Error("sin red");
  };
  const caida = await mapaRoute.GET(
    new Request("http://localhost/api/mapa?tipo=ruta&origen=10.4631,-73.2532&destino=10.4491234,-73.2625229"),
  );
  assert.equal(caida.status, 502);
});

// --- Inicio de sesión ---

function peticionLogin(cabeceras = {}) {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cabeceras },
    body: JSON.stringify({ correo: "Ana@Unicesar.edu.co", contrasena: "ClaveSegura1" }),
  });
}

test("login: informa al backend la IP del navegador", async () => {
  simularBackend(() => ({
    cuerpo: { idPersonas: 7, correo: "ana@unicesar.edu.co", primerNombre: "Ana", primerApellido: "Díaz" },
  }));
  const res = await loginRoute.POST(peticionLogin({ "x-real-ip": "203.0.113.7" }));
  assert.equal(res.status, 200);
  assert.equal(llamadas[0].opciones.headers["X-Cliente-Ip"], "203.0.113.7");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.match(res.headers.get("set-cookie") ?? "", /sesion=.*HttpOnly/i);
});

test("login: toma la primera IP de x-forwarded-for y descarta valores que no son IP", async () => {
  simularBackend(() => ({ status: 401, cuerpo: "Credenciales inválidas" }));

  await loginRoute.POST(peticionLogin({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }));
  assert.equal(llamadas[0].opciones.headers["X-Cliente-Ip"], "198.51.100.4");

  await loginRoute.POST(peticionLogin({ "x-real-ip": "no-es-una-ip; DROP" }));
  assert.equal("X-Cliente-Ip" in llamadas[1].opciones.headers, false);
});

test("login: avisa del bloqueo temporal sin crear sesión", async () => {
  simularBackend(() => ({ status: 429, cuerpo: "Demasiados intentos fallidos." }));
  const res = await loginRoute.POST(peticionLogin());
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /Demasiados intentos/);
  assert.equal(res.headers.get("set-cookie"), null);
});

// --- Errores internos del backend ---

test("errores: un 500 del backend no llega con su detalle al navegador", async () => {
  await iniciarSesion("7");
  const traza = "System.InvalidOperationException: Host=db.interna;Password=secreta\n   at Backend.Controllers";
  simularBackend(() => ({ status: 500, cuerpo: traza }));

  const res = await vehiculoRoute.GET(new Request("http://localhost/api/vehiculo"));
  assert.equal(res.status, 500);
  const { error } = await res.json();
  assert.doesNotMatch(error, /System\.|Password|Backend\./);
  assert.match(error, /no está disponible/);
});

test("errores: los mensajes de validación (4xx) sí se muestran", async () => {
  await iniciarSesion("7");
  simularBackend(() => ({ status: 409, cuerpo: "Ya tienes un viaje en curso." }));
  const res = await vehiculoRoute.GET(new Request("http://localhost/api/vehiculo"));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "Ya tienes un viaje en curso.");
});
