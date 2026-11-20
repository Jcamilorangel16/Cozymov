// Pruebas de la autorización de tiempo real en Next.js: la ruta que entrega el ticket de un
// solo uso, la URL pública del Hub y la CSP que permite el WebSocket.
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
const CLAVE_INTERNA = "api-interna-prueba";
const TICKET = "a".repeat(64);
process.env.SESSION_SECRET = SECRETO_PRUEBA;
process.env.VITE_API_URL = "https://backend.example";
process.env.INTERNAL_API_KEY = CLAVE_INTERNA;

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
let ticketRoute;
let urlHubTiempoReal;
let origenWebSocketHub;
let configuracionNext;

before(async () => {
  ({ NextRequest } = await import("next/server.js"));
  ({ proxy } = await import("../proxy.ts"));
  ({ firmarSesion } = await import("../src/lib/auth.ts"));
  ticketRoute = await import("../app/api/tiempo-real/ticket/route.ts");
  ({ urlHubTiempoReal, origenWebSocketHub } = await import("../src/lib/tiempoRealUrl.ts"));
  // La CSP se calcula al cargar la configuración, con el VITE_API_URL de arriba.
  configuracionNext = (await import("../next.config.ts")).default;
});

const originalFetch = globalThis.fetch;
const errorOriginal = console.error;
const entornoOriginal = { ...process.env };
let llamadas;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = CLAVE_INTERNA;
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  delete process.env.SIGNALR_HUB_URL;
  cookieSesion = null;
  llamadas = [];
  console.error = () => {};
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = errorOriginal;
  for (const nombre of ["VITE_API_URL", "INTERNAL_API_KEY", "SIGNALR_HUB_URL", "NODE_ENV"]) {
    if (entornoOriginal[nombre] === undefined) delete process.env[nombre];
    else process.env[nombre] = entornoOriginal[nombre];
  }
});

async function iniciarSesion(id = "7") {
  cookieSesion = await firmarSesion({ id, correo: "ana@unicesar.edu.co", nombre: "Ana Díaz" });
}

function simularBackend({ status = 200, cuerpo = { ticket: TICKET, expiraEnSegundos: 60 } } = {}) {
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    const contenido = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
    return new Response(contenido, { status });
  };
}

// --- Ruta del ticket ---

test("ticket: sin sesión no se pide ticket al backend", async () => {
  simularBackend();

  const respuesta = await ticketRoute.POST();

  assert.equal(respuesta.status, 401);
  assert.equal(llamadas.length, 0);
});

test("ticket: se pide para el usuario de la sesión, con la clave interna solo hacia el backend", async () => {
  await iniciarSesion("7");
  simularBackend();

  const respuesta = await ticketRoute.POST();
  const cuerpo = await respuesta.json();

  assert.equal(respuesta.status, 200);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, "https://backend.example/api/tiempo-real/tickets");
  assert.equal(llamadas[0].opciones.method, "POST");
  assert.equal(llamadas[0].opciones.headers["X-Internal-Api-Key"], CLAVE_INTERNA);
  assert.deepEqual(JSON.parse(llamadas[0].opciones.body), { idUsuario: 7 });
  // El navegador solo recibe el ticket y la URL del Hub.
  assert.deepEqual(cuerpo, { ticket: TICKET, url: "https://backend.example/hubs/tiempo-real" });
  assert.ok(!JSON.stringify(cuerpo).includes(CLAVE_INTERNA));
  assert.equal(respuesta.headers.get("cache-control"), "no-store");
});

test("ticket: la ruta no acepta parámetros del cliente para elegir el usuario", async () => {
  // POST no recibe la solicitud: no hay forma de indicar otro id.
  assert.equal(ticketRoute.POST.length, 0);
  assert.equal(ticketRoute.GET, undefined);
});

test("ticket: SIGNALR_HUB_URL cambia la URL que recibe el navegador", async () => {
  await iniciarSesion();
  process.env.SIGNALR_HUB_URL = "https://tiempo-real.example/hubs/tiempo-real";
  simularBackend();

  const cuerpo = await (await ticketRoute.POST()).json();

  assert.equal(cuerpo.url, "https://tiempo-real.example/hubs/tiempo-real");
});

test("ticket: desactivado o sin URL válida responde 503 «desactivado» sin llamar al backend", async () => {
  await iniciarSesion();
  simularBackend();

  for (const valor of ["off", "ftp://backend.example/hub", "no es una url"]) {
    process.env.SIGNALR_HUB_URL = valor;
    const respuesta = await ticketRoute.POST();
    assert.equal(respuesta.status, 503, valor);
    assert.equal((await respuesta.json()).desactivado, true);
  }
  assert.equal(llamadas.length, 0);
});

test("ticket: si el backend no reconoce al usuario o la clave, el navegador deja de reintentar", async () => {
  await iniciarSesion();

  for (const status of [401, 404]) {
    simularBackend({ status, cuerpo: "No autorizado." });
    const respuesta = await ticketRoute.POST();
    assert.equal(respuesta.status, 503);
    assert.equal((await respuesta.json()).desactivado, true);
  }
});

test("ticket: el límite del backend se reenvía y los errores 5xx no filtran detalles", async () => {
  await iniciarSesion();

  simularBackend({ status: 429, cuerpo: "Demasiadas conexiones en poco tiempo." });
  assert.equal((await ticketRoute.POST()).status, 429);

  simularBackend({ status: 500, cuerpo: "System.Exception: detalle interno en Program.cs" });
  const respuesta = await ticketRoute.POST();
  const cuerpo = await respuesta.json();
  assert.equal(respuesta.status, 500);
  assert.ok(!cuerpo.error.includes("Program.cs"));
});

test("ticket: un ticket con formato inesperado no se entrega", async () => {
  await iniciarSesion();
  simularBackend({ cuerpo: { ticket: "<script>", expiraEnSegundos: 60 } });

  assert.equal((await ticketRoute.POST()).status, 502);
});

test("ticket: proxy.ts rechaza pedirlo desde otro sitio (CSRF)", () => {
  const solicitud = (origin) =>
    new NextRequest("https://cozymov.example/api/tiempo-real/ticket", {
      method: "POST",
      headers: { host: "cozymov.example", origin },
    });

  assert.equal(proxy(solicitud("https://sitio-malicioso.example")).status, 403);
  assert.notEqual(proxy(solicitud("https://cozymov.example")).status, 403);
});

// --- URL del Hub y CSP ---

test("url: se deriva de VITE_API_URL sin barras repetidas", () => {
  assert.equal(
    urlHubTiempoReal({ VITE_API_URL: "https://api.example/" }),
    "https://api.example/hubs/tiempo-real",
  );
  assert.equal(urlHubTiempoReal({}), null);
});

test("url: en producción exige HTTPS salvo en localhost", () => {
  assert.equal(urlHubTiempoReal({ NODE_ENV: "production", VITE_API_URL: "http://api.example" }), null);
  assert.equal(
    urlHubTiempoReal({ NODE_ENV: "production", VITE_API_URL: "http://localhost:5146" }),
    "http://localhost:5146/hubs/tiempo-real",
  );
  assert.equal(
    urlHubTiempoReal({ NODE_ENV: "development", VITE_API_URL: "http://192.168.1.5:5146" }),
    "http://192.168.1.5:5146/hubs/tiempo-real",
  );
});

test("url: no admite credenciales ni parámetros en la URL", () => {
  assert.equal(urlHubTiempoReal({ SIGNALR_HUB_URL: "https://u:p@api.example/hub" }), null);
  assert.equal(urlHubTiempoReal({ SIGNALR_HUB_URL: "https://api.example/hub?access_token=x" }), null);
});

test("csp: connect-src permite solo el WebSocket del backend además del propio sitio", async () => {
  assert.equal(origenWebSocketHub("https://api.example/hubs/tiempo-real"), "wss://api.example");
  assert.equal(origenWebSocketHub("http://localhost:5146/hubs/tiempo-real"), "ws://localhost:5146");
  assert.equal(origenWebSocketHub(null), null);

  const reglas = await configuracionNext.headers();
  const csp = reglas[0].headers.find((cabecera) => cabecera.key === "Content-Security-Policy").value;
  const connectSrc = csp.split("; ").find((directiva) => directiva.startsWith("connect-src"));
  assert.match(connectSrc, /^connect-src 'self' wss:\/\/backend\.example( |$)/);
  assert.ok(!connectSrc.includes("*"));
});
