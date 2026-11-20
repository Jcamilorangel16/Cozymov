import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../app/api/registro/route.ts";
import { firmarCorreoVerificado } from "../src/lib/verificacionCorreo.ts";

process.env.SESSION_SECRET = "secreto-de-prueba-no-real-con-longitud-suficiente";

/** Cookie que deja el callback de Google tras verificar el correo. */
async function cookieVerificada(correo = "persona@example.edu.co") {
  return `correo_verificado=${await firmarCorreoVerificado({ correo, sub: "sub-1" })}`;
}

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.VITE_API_URL;
const originalInternalApiKey = process.env.INTERNAL_API_KEY;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = originalApiUrl;
  if (originalInternalApiKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = originalInternalApiKey;
});

function configurarApi() {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
}

function crearSolicitudRegistro(cambios = {}, cookie) {
  return new Request("http://localhost/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify({
      idUsuario: "12345",
      primerNombre: "Persona",
      segundoNombre: null,
      primerApellido: "Prueba",
      segundoApellido: null,
      edad: 20,
      correo: " Persona@Example.edu.co ",
      contrasena: "contrasena-segura",
      ocupacion: "estudiante",
      telefono: " 300 123 4567 ",
      ...cambios,
    }),
  });
}

test("con el correo verificado registra, borra la verificación y no reenvía la respuesta del backend", async () => {
  configurarApi();
  let llamada;
  globalThis.fetch = async (url, init) => {
    llamada = { url, init };
    return Response.json({ contrasena: "no-debe-salir" }, { status: 201 });
  };

  const respuesta = await POST(crearSolicitudRegistro({}, await cookieVerificada()));

  assert.equal(respuesta.status, 201);
  assert.deepEqual(await respuesta.json(), { mensaje: "Registro exitoso." });
  assert.match(respuesta.headers.get("set-cookie") ?? "", /^correo_verificado=;.*Max-Age=0/);
  assert.equal(llamada.url, "https://backend.example/api/registro");
  assert.equal(llamada.init.headers["X-Internal-Api-Key"], "api-interna-prueba");
  const cuerpo = JSON.parse(llamada.init.body);
  assert.equal(cuerpo.Correo, "persona@example.edu.co");
  assert.equal(cuerpo.Telefono, "+573001234567");
  assert.equal("Verificacion" in cuerpo, false);
});

for (const [caso, cookie] of [
  ["sin verificar el correo", async () => undefined],
  ["con otro correo verificado", async () => cookieVerificada("otra@example.edu.co")],
  ["con una verificación falsificada", async () => "correo_verificado=token-inventado"],
]) {
  test(`rechaza el registro ${caso} sin llamar al backend`, async () => {
    configurarApi();
    let llamado = false;
    globalThis.fetch = async () => {
      llamado = true;
      return Response.json({}, { status: 201 });
    };

    const respuesta = await POST(crearSolicitudRegistro({}, await cookie()));

    assert.equal(respuesta.status, 403);
    assert.deepEqual(await respuesta.json(), {
      error: "Verifica tu correo con Google antes de crear la cuenta.",
      verificar: true,
    });
    assert.equal(llamado, false);
  });
}

test("rechaza el registro sin celular antes de llamar al backend", async () => {
  configurarApi();
  let llamado = false;
  globalThis.fetch = async () => {
    llamado = true;
    return Response.json({}, { status: 201 });
  };

  const respuesta = await POST(crearSolicitudRegistro({ telefono: undefined }));

  assert.equal(respuesta.status, 400);
  assert.equal(llamado, false);
});

test("devuelve el mensaje de rate limit como texto legible en el registro", async () => {
  configurarApi();
  globalThis.fetch = async () =>
    Response.json(
      { error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde." },
      { status: 429 },
    );

  const respuesta = await POST(crearSolicitudRegistro({}, await cookieVerificada()));

  assert.equal(respuesta.status, 429);
  assert.deepEqual(await respuesta.json(), {
    error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde.",
  });
});
