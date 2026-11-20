import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { POST } from "../app/api/registro/route.ts";

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
      correo: " Persona@Example.edu.co ",
      contrasena: "contrasena-segura",
      ocupacion: "estudiante",
    }),
  });
}

test("registra sin código de verificación y no reenvía la respuesta del backend", async () => {
  configurarApi();
  let llamada;
  globalThis.fetch = async (url, init) => {
    llamada = { url, init };
    return Response.json({ contrasena: "no-debe-salir" }, { status: 201 });
  };

  const respuesta = await POST(crearSolicitudRegistro());

  assert.equal(respuesta.status, 201);
  assert.deepEqual(await respuesta.json(), { mensaje: "Registro exitoso." });
  assert.equal(llamada.url, "https://backend.example/api/registro");
  assert.equal(llamada.init.headers["X-Internal-Api-Key"], "api-interna-prueba");
  const cuerpo = JSON.parse(llamada.init.body);
  assert.equal(cuerpo.Correo, "persona@example.edu.co");
  assert.equal("Verificacion" in cuerpo, false);
});

test("devuelve el mensaje de rate limit como texto legible en el registro", async () => {
  configurarApi();
  globalThis.fetch = async () =>
    Response.json(
      { error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde." },
      { status: 429 },
    );

  const respuesta = await POST(crearSolicitudRegistro());

  assert.equal(respuesta.status, 429);
  assert.deepEqual(await respuesta.json(), {
    error: "Has realizado demasiados intentos. Inténtalo de nuevo más tarde.",
  });
});
