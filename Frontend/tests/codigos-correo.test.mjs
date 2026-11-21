// Pruebas de las rutas que envían y usan códigos por correo (SMTP en el backend).
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { POST as enviarCodigo } from "../app/api/codigo-correo/route.ts";
import { POST as verificarCodigo } from "../app/api/verificacion-correo/route.ts";
import { POST as restablecer } from "../app/api/recuperacion/route.ts";
import { POST as registrar } from "../app/api/registro/route.ts";
import { normalizarCodigo } from "../src/lib/codigosCorreo.ts";
import { verificarCorreoVerificado } from "../src/lib/verificacionCorreo.ts";

const fetchOriginal = globalThis.fetch;
const entornoOriginal = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = "secreto-de-prueba-no-real-con-longitud-suficiente";
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  for (const nombre of ["SESSION_SECRET", "VITE_API_URL", "INTERNAL_API_KEY"]) {
    if (entornoOriginal[nombre] === undefined) delete process.env[nombre];
    else process.env[nombre] = entornoOriginal[nombre];
  }
});

function solicitud(ruta, cuerpo, cabeceras = {}) {
  return new Request(`http://localhost${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cabeceras },
    body: JSON.stringify(cuerpo),
  });
}

/** Simula el backend y guarda las llamadas. */
function simularBackend(respuesta) {
  const llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url, init, cuerpo: JSON.parse(init.body) });
    return typeof respuesta === "function" ? respuesta(url) : respuesta.clone();
  };
  return llamadas;
}

test("normalizarCodigo acepta seis dígitos con espacios o guiones", () => {
  assert.equal(normalizarCodigo(" 123 456 "), "123456");
  assert.equal(normalizarCodigo("123-456"), "123456");
  for (const valor of ["12345", "1234567", "12a456", 123456, null]) {
    assert.equal(normalizarCodigo(valor), null, String(valor));
  }
});

test("enviar código reenvía correo normalizado, propósito e IP al backend", async () => {
  const llamadas = simularBackend(Response.json({ mensaje: "Te enviamos un código." }, { status: 202 }));

  const respuesta = await enviarCodigo(
    solicitud("/api/codigo-correo", { correo: " Ana@Unicesar.edu.co ", proposito: "registro" }, {
      "x-forwarded-for": "203.0.113.7",
    }),
  );

  assert.equal(respuesta.status, 202);
  assert.equal(llamadas[0].url, "https://backend.example/api/codigos-correo/enviar");
  assert.deepEqual(llamadas[0].cuerpo, { Correo: "ana@unicesar.edu.co", Proposito: "registro" });
  assert.equal(llamadas[0].init.headers["X-Internal-Api-Key"], "api-interna-prueba");
});

test("enviar código rechaza propósito o correo inválidos sin llamar al backend", async () => {
  const llamadas = simularBackend(Response.json({}, { status: 202 }));

  for (const cuerpo of [
    { correo: "ana@unicesar.edu.co", proposito: "otro" },
    { correo: "no-es-correo", proposito: "registro" },
    { correo: "no-es-correo", proposito: "recuperacion" },
  ]) {
    const respuesta = await enviarCodigo(solicitud("/api/codigo-correo", cuerpo));
    assert.equal(respuesta.status, 400, JSON.stringify(cuerpo));
  }
  assert.equal(llamadas.length, 0);
});

test("si el SMTP falla, el navegador recibe un mensaje propio y no el detalle", async () => {
  simularBackend(
    Response.json({ error: "detalle interno", motivo: "envio_fallido" }, { status: 503 }),
  );

  const respuesta = await enviarCodigo(
    solicitud("/api/codigo-correo", { correo: "ana@unicesar.edu.co", proposito: "recuperacion" }),
  );

  assert.equal(respuesta.status, 503);
  const cuerpo = await respuesta.json();
  assert.match(cuerpo.error, /No pudimos enviar el correo/);
  assert.doesNotMatch(cuerpo.error, /detalle interno/);
});

test("la espera de reenvío del backend llega al navegador", async () => {
  simularBackend(
    Response.json({ error: "Espera 42 segundos antes de pedir otro código.", esperar: 42 }, { status: 429 }),
  );

  const respuesta = await enviarCodigo(
    solicitud("/api/codigo-correo", { correo: "ana@unicesar.edu.co", proposito: "registro" }),
  );

  assert.equal(respuesta.status, 429);
  assert.equal((await respuesta.json()).esperar, 42);
});

test("un código correcto firma la cookie de correo verificado y permite registrarse", async () => {
  const llamadas = simularBackend(Response.json({ correo: "ana@unicesar.edu.co" }));

  const respuesta = await verificarCodigo(
    solicitud("/api/verificacion-correo", { correo: "Ana@Unicesar.edu.co", codigo: "123 456" }),
  );

  assert.equal(respuesta.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/codigos-correo/verificar");
  assert.deepEqual(llamadas[0].cuerpo, { Correo: "ana@unicesar.edu.co", Codigo: "123456" });
  const cookie = respuesta.headers.get("set-cookie");
  assert.match(cookie, /^correo_verificado=[^;]+; Path=\/; Max-Age=1800; HttpOnly; SameSite=Lax/);
  const token = cookie.split(";")[0].slice("correo_verificado=".length);
  assert.deepEqual(await verificarCorreoVerificado(token), { correo: "ana@unicesar.edu.co" });

  // Con esa cookie, POST /api/registro llama al backend en vez de responder 403.
  const registro = simularBackend(Response.json({ idPersonas: 9 }, { status: 201 }));
  const creada = await registrar(
    solicitud(
      "/api/registro",
      {
        idUsuario: "12345", primerNombre: "Ana", primerApellido: "Díaz", edad: 20,
        correo: "ana@unicesar.edu.co", contrasena: "ClaveSegura1", ocupacion: "estudiante",
        telefono: "3001234567",
      },
      { cookie: cookie.split(";")[0] },
    ),
  );
  assert.equal(creada.status, 201);
  assert.equal(registro.length, 1);
});

test("un código incorrecto no firma la cookie", async () => {
  simularBackend(Response.json({ error: "El código es incorrecto o venció." }, { status: 400 }));

  const respuesta = await verificarCodigo(
    solicitud("/api/verificacion-correo", { correo: "ana@unicesar.edu.co", codigo: "000000" }),
  );

  assert.equal(respuesta.status, 400);
  assert.equal(respuesta.headers.get("set-cookie"), null);
  assert.match((await respuesta.json()).error, /incorrecto/);
});

test("restablecer valida la contraseña antes de gastar el código", async () => {
  const llamadas = simularBackend(new Response(null, { status: 204 }));

  const corta = await restablecer(
    solicitud("/api/recuperacion", { correo: "ana@unicesar.edu.co", codigo: "123456", nuevaContrasena: "corta" }),
  );
  assert.equal(corta.status, 400);
  assert.equal(llamadas.length, 0);

  const respuesta = await restablecer(
    solicitud("/api/recuperacion", {
      correo: " Ana@Unicesar.edu.co ", codigo: "123456", nuevaContrasena: "ClaveNueva2",
    }),
  );
  assert.equal(respuesta.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/codigos-correo/restablecer-contrasena");
  assert.deepEqual(llamadas[0].cuerpo, {
    Correo: "ana@unicesar.edu.co", Codigo: "123456", NuevaContrasena: "ClaveNueva2",
  });
  // No inicia sesión.
  assert.equal(respuesta.headers.get("set-cookie"), null);
});
