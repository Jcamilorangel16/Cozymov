import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { POST } from "../app/api/recuperar-contraseña/route.ts";

const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.VITE_API_URL;
const originalInternalApiKey = process.env.INTERNAL_API_KEY;

beforeEach(() => {
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = originalApiUrl;
  if (originalInternalApiKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = originalInternalApiKey;
});

function solicitud(cuerpo) {
  return new Request("http://localhost/api/recuperar-contraseña", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": "203.0.113.9" },
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

function simularBackend(status = 200, cuerpo = { mensaje: "ok" }) {
  const llamadas = [];
  globalThis.fetch = async (url, init) => {
    llamadas.push({ url: String(url), init });
    return Response.json(cuerpo, { status });
  };
  return llamadas;
}

test("solicitar reenvía el correo normalizado al backend con la clave interna", async () => {
  const llamadas = simularBackend();

  const respuesta = await POST(
    solicitud({ accion: "solicitar", correo: "  Ana@Unicesar.edu.co " }),
  );

  assert.equal(respuesta.status, 200);
  assert.equal(llamadas.length, 1);
  assert.equal(llamadas[0].url, "https://backend.example/api/recuperacion/solicitar");
  assert.equal(llamadas[0].init.headers["X-Internal-Api-Key"], "api-interna-prueba");
  assert.equal(llamadas[0].init.headers["X-Forwarded-For"], "203.0.113.9");
  assert.deepEqual(JSON.parse(llamadas[0].init.body), { correo: "ana@unicesar.edu.co" });
});

test("restablecer reenvía código y contraseña al backend", async () => {
  const llamadas = simularBackend();

  const respuesta = await POST(
    solicitud({
      accion: "restablecer",
      correo: "ana@unicesar.edu.co",
      codigo: " 123456 ",
      nuevaContrasena: "ClaveNueva123",
    }),
  );

  assert.equal(respuesta.status, 200);
  assert.equal(llamadas[0].url, "https://backend.example/api/recuperacion/restablecer");
  assert.deepEqual(JSON.parse(llamadas[0].init.body), {
    correo: "ana@unicesar.edu.co",
    codigo: "123456",
    nuevaContrasena: "ClaveNueva123",
  });
});

test("rechaza entradas inválidas sin llamar al backend", async () => {
  const llamadas = simularBackend();
  const base = { correo: "ana@unicesar.edu.co", codigo: "123456", nuevaContrasena: "ClaveNueva123" };
  const casos = [
    "no es json",
    { accion: "borrar", correo: base.correo },
    { accion: "solicitar", correo: "sin-arroba" },
    { accion: "solicitar" },
    { accion: "restablecer", ...base, codigo: "12ab56" },
    { accion: "restablecer", ...base, nuevaContrasena: "corta" },
    { accion: "restablecer", ...base, nuevaContrasena: "a".repeat(73) },
  ];

  for (const caso of casos) {
    const respuesta = await POST(solicitud(caso));
    assert.equal(respuesta.status, 400, JSON.stringify(caso));
  }
  assert.equal(llamadas.length, 0);
});

test("propaga el error del backend (429, código inválido)", async () => {
  simularBackend(400, { error: "El código es inválido o ha vencido." });

  const respuesta = await POST(
    solicitud({
      accion: "restablecer",
      correo: "ana@unicesar.edu.co",
      codigo: "123456",
      nuevaContrasena: "ClaveNueva123",
    }),
  );

  assert.equal(respuesta.status, 400);
  assert.equal((await respuesta.json()).error, "El código es inválido o ha vencido.");
});

test("responde 500 sin configuración y 502 si el backend no responde", async () => {
  delete process.env.INTERNAL_API_KEY;
  const sinConfig = await POST(solicitud({ accion: "solicitar", correo: "ana@unicesar.edu.co" }));
  assert.equal(sinConfig.status, 500);

  process.env.INTERNAL_API_KEY = "api-interna-prueba";
  globalThis.fetch = async () => {
    throw new Error("red caída");
  };
  const originalError = console.error;
  console.error = () => {};
  try {
    const caida = await POST(solicitud({ accion: "solicitar", correo: "ana@unicesar.edu.co" }));
    assert.equal(caida.status, 502);
  } finally {
    console.error = originalError;
  }
});
