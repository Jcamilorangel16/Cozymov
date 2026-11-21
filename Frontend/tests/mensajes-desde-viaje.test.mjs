// Pruebas de «Mensajes» desde un viaje, antes de confirmar la reserva.
import assert from "node:assert/strict";
import { afterEach, before, beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";
import {
  conversacionEsDelViaje,
  contactoDeViaje,
  contextoDeViaje,
  puedeMensajearDesdeViaje,
} from "../src/features/buscar-viajes/utils/mensajesViaje.js";
import { puedeAceptarViaje } from "../src/features/viajes/validations/viajes.ts";
import {
  apilarVista,
  historialAlVolverAlViaje,
} from "../src/features/menu-principal/utils/historialVistas.js";

// Las rutas usan importaciones sin extensión (resueltas por Next.js).
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
let mensajesRoute;

before(async () => {
  ({ firmarSesion } = await import("../src/lib/auth.ts"));
  mensajesRoute = await import("../app/api/mensajes/route.ts");
});

const viaje = {
  id_viaje: 41,
  id_usuario: 9,
  primer_nombre: "Carlos",
  primer_apellido: "Mejía",
  origen: "CENTRO",
  destino: "Universidad Popular Del Cesar",
  cupos_disponibles: 2,
};

const estadoLibre = { idUsuario: "7", viaje, validacionCompletada: true, tieneViajeEnCurso: false };

// ---- Abrir la conversación desde el viaje y conductor correcto ----

test("el contacto de la conversación es el conductor del viaje", () => {
  assert.deepEqual(contactoDeViaje(viaje), { id: "9", nombre: "Carlos Mejía" });
  assert.deepEqual(
    contactoDeViaje({ ...viaje, nombre_conductor: "Carlos A. Mejía" }),
    { id: "9", nombre: "Carlos A. Mejía" },
  );
});

test("un viaje sin conductor identificado no abre conversación", () => {
  assert.equal(contactoDeViaje({ ...viaje, id_usuario: null }), null);
  assert.equal(contactoDeViaje({ ...viaje, id_usuario: undefined }), null);
  assert.equal(puedeMensajearDesdeViaje({ ...estadoLibre, viaje: { ...viaje, id_usuario: null } }), false);
});

test("el botón Mensajes aparece en un viaje ajeno aún sin reservar", () => {
  assert.equal(puedeMensajearDesdeViaje(estadoLibre), true);
});

// ---- Botón oculto tras confirmar o sin condiciones ----

test("tras confirmar una reserva el botón desaparece y aceptar queda bloqueado", () => {
  assert.equal(puedeMensajearDesdeViaje({ ...estadoLibre, tieneViajeEnCurso: true }), false);
  assert.equal(puedeAceptarViaje("7", true, false, true), false);
});

test("no aparece en el viaje propio, sin sesión ni mientras se valida el estado", () => {
  assert.equal(puedeMensajearDesdeViaje({ ...estadoLibre, idUsuario: "9" }), false);
  assert.equal(puedeMensajearDesdeViaje({ ...estadoLibre, idUsuario: "" }), false);
  assert.equal(puedeMensajearDesdeViaje({ ...estadoLibre, validacionCompletada: false }), false);
});

// ---- Volver al viaje conserva el viaje seleccionado ----

test("el contexto guardado conserva el viaje y la búsqueda aplicada", () => {
  const filtros = { origen: "centro", destino: "universidad", fecha: "2030-01-02" };
  assert.deepEqual(contextoDeViaje(viaje, filtros), {
    id_viaje: 41,
    origen: "CENTRO",
    destino: "Universidad Popular Del Cesar",
    id_conductor: "9",
    filtros,
  });
  assert.deepEqual(contextoDeViaje(viaje).filtros, { origen: "", destino: "", fecha: "" });
});

test("«Volver al viaje» solo se ofrece en la conversación con el conductor de ese viaje", () => {
  const contexto = contextoDeViaje(viaje);
  assert.equal(conversacionEsDelViaje(contexto, { id: "9", nombre: "Carlos" }), true);
  assert.equal(conversacionEsDelViaje(contexto, { id: "10", nombre: "Otra" }), false);
  assert.equal(conversacionEsDelViaje(null, { id: "9" }), false);
});

test("volver al viaje regresa a Buscar y consume esa entrada del historial", () => {
  const alChat = apilarVista(["inicio"], "buscar", "mensajes");
  assert.deepEqual(alChat, ["inicio", "buscar"]);
  assert.deepEqual(historialAlVolverAlViaje(alChat), ["inicio"]);
  // Si no se venía de Buscar (aviso de mensaje), el historial no se altera.
  assert.deepEqual(historialAlVolverAlViaje(["inicio", "ofrecer"]), ["inicio", "ofrecer"]);
});

// ---- Sin reserva por entrar a la conversación; la sesión manda ----

const originalFetch = globalThis.fetch;
let llamadas;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
  cookieSesion = null;
  llamadas = [];
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), opciones });
    if (opciones.method === "POST") {
      return new Response(
        JSON.stringify({
          idMensaje: 1,
          idEmisor: 7,
          idReceptor: 9,
          contenido: "Hola",
          fechaHora: "2030-01-01T10:00:00",
          leido: false,
        }),
        { status: 201 },
      );
    }
    return new Response("[]", { status: 200 });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function iniciarSesion(id) {
  cookieSesion = await firmarSesion({ id, correo: "ana@unicesar.edu.co", nombre: "Ana Díaz" });
}

test("abrir la conversación y escribir solo toca /api/Mensajes: no crea reserva", async () => {
  await iniciarSesion("7");
  const lectura = await mensajesRoute.GET(
    new Request("https://cozymov.example/api/mensajes?usuario1=7&usuario2=9"),
  );
  assert.equal(lectura.status, 200);
  const envio = await mensajesRoute.POST(
    new Request("https://cozymov.example/api/mensajes", {
      method: "POST",
      body: JSON.stringify({ id_emisor: "7", id_receptor: "9", contenido: "Hola" }),
    }),
  );
  assert.equal(envio.status, 201);

  assert.equal(llamadas.length, 2);
  for (const { url } of llamadas) {
    assert.match(url, /^https:\/\/backend\.example\/api\/Mensajes/);
    assert.doesNotMatch(url, /Viajes|reserva|aceptar/i);
  }
  assert.match(llamadas[0].url, /conversacion\?yo=7&otro=9$/);
  assert.deepEqual(JSON.parse(llamadas[1].opciones.body), {
    IdEmisor: 7,
    IdReceptor: 9,
    Contenido: "Hola",
  });
});

test("el emisor sale de la sesión: no se puede escribir ni leer como otro usuario", async () => {
  await iniciarSesion("7");
  const envio = await mensajesRoute.POST(
    new Request("https://cozymov.example/api/mensajes", {
      method: "POST",
      body: JSON.stringify({ id_emisor: "8", id_receptor: "9", contenido: "Hola" }),
    }),
  );
  assert.equal(envio.status, 403);
  const lectura = await mensajesRoute.GET(
    new Request("https://cozymov.example/api/mensajes?usuario1=8&usuario2=9"),
  );
  assert.equal(lectura.status, 403);
  assert.equal(llamadas.length, 0);
});

test("sin sesión la conversación responde 401 y no llama al backend", async () => {
  const lectura = await mensajesRoute.GET(
    new Request("https://cozymov.example/api/mensajes?usuario1=7&usuario2=9"),
  );
  assert.equal(lectura.status, 401);
  assert.equal(llamadas.length, 0);
});
