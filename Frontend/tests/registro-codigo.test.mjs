import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../app/api/registro/codigo/route.ts";
import { POST as POSTRegistro } from "../app/api/registro/route.ts";

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

function crearSolicitud(correo = " Persona@Example.edu.co ") {
  return new Request("http://localhost/api/registro/codigo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-real-ip": "203.0.113.8",
    },
    body: JSON.stringify({ correo }),
  });
}

function crearSolicitudRegistro() {
  return new Request("http://localhost/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      idUsuario: "12345",
      primerNombre: "Persona",
      segundoNombre: null,
      primerApellido: "Prueba",
      segundoApellido: null,
      edad: 20,
      correo: "persona@example.edu.co",
      contrasena: "contrasena-segura",
      ocupacion: "estudiante",
      verificacion: {
        comprobante: "YWJj",
        codigo: "123456",
      },
    }),
  });
}

test("reenvía el correo normalizado al backend y devuelve su comprobante", async () => {
  configurarApi();
  let llamada;
  globalThis.fetch = async (url, init) => {
    llamada = { url, init };
    return Response.json({ comprobante: "firma", vence: 1_800_000_000 });
  };

  const respuesta = await POST(crearSolicitud());

  assert.equal(respuesta.status, 200);
  assert.equal(llamada.url, "https://backend.example/api/registro/codigo");
  assert.deepEqual(JSON.parse(llamada.init.body), {
    correo: "persona@example.edu.co",
  });
  assert.equal(llamada.init.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.equal(llamada.init.headers["X-Forwarded-For"], "203.0.113.8");
  assert.deepEqual(await respuesta.json(), {
    comprobante: "firma",
    vence: 1_800_000_000,
  });
});

for (const [status, error] of [
  [409, "Ese correo ya está registrado. Inicia sesión o recupera tu contraseña."],
  [429, "Demasiados intentos"],
  [502, "Brevo no disponible"],
  [503, "Brevo no configurado"],
]) {
  test(`propaga el error ${status} del backend sin convertirlo en éxito`, async () => {
    configurarApi();
    globalThis.fetch = async () =>
      Response.json({ error }, { status });

    const respuesta = await POST(crearSolicitud());

    assert.equal(respuesta.status, status);
    assert.deepEqual(await respuesta.json(), { error });
  });
}

test("informa configuración faltante sin llamar al backend", async () => {
  delete process.env.VITE_API_URL;
  delete process.env.INTERNAL_API_KEY;
  globalThis.fetch = async () => {
    assert.fail("No debe llamar al backend cuando falta la configuración.");
  };

  const respuesta = await POST(crearSolicitud());

  assert.equal(respuesta.status, 500);
  assert.match((await respuesta.json()).error, /configurar/i);
});

test("devuelve el mensaje de rate limit como texto legible en el registro", async () => {
  configurarApi();
  globalThis.fetch = async () =>
    Response.json(
      { error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde." },
      { status: 429 },
    );

  const respuesta = await POSTRegistro(crearSolicitudRegistro());

  assert.equal(respuesta.status, 429);
  assert.deepEqual(await respuesta.json(), {
    error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde.",
  });
});
