import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { performance } from "node:perf_hooks";
import { POST } from "../app/api/registro/route.ts";
import { firmarCorreoVerificado } from "../src/lib/verificacionCorreo.ts";

/** Cookie que deja el callback de Google tras verificar el correo. */
async function cookieVerificada(correo = "persona@example.edu.co") {
  return `correo_verificado=${await firmarCorreoVerificado({ correo, sub: "sub-1" })}`;
}

const originalFetch = globalThis.fetch;
const originalSessionSecret = process.env.SESSION_SECRET;
const originalApiUrl = process.env.VITE_API_URL;
const originalInternalApiKey = process.env.INTERNAL_API_KEY;
const CANTIDAD_REGISTROS_CARGA = 3000;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
  if (originalApiUrl === undefined) delete process.env.VITE_API_URL;
  else process.env.VITE_API_URL = originalApiUrl;
  if (originalInternalApiKey === undefined) delete process.env.INTERNAL_API_KEY;
  else process.env.INTERNAL_API_KEY = originalInternalApiKey;
});

function configurarApi() {
  process.env.SESSION_SECRET = "secreto-de-prueba-no-real-con-longitud-suficiente";
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

async function medirSolicitudes(t, solicitudes, { concurrentes = false } = {}) {
  const duraciones = [];
  const ejecutar = async (solicitud) => {
    const inicio = performance.now();
    const respuesta = await POST(solicitud);
    const cuerpo = await respuesta.json();
    return {
      status: respuesta.status,
      cuerpo,
      duracion: performance.now() - inicio,
    };
  };

  const inicioTotal = performance.now();
  let resultados;
  if (concurrentes) {
    resultados = await Promise.all(solicitudes.map(ejecutar));
  } else {
    resultados = [];
    for (const solicitud of solicitudes) resultados.push(await ejecutar(solicitud));
  }
  const tiempoTotal = performance.now() - inicioTotal;
  duraciones.push(...resultados.map(({ duracion }) => duracion));

  const promedio = duraciones.reduce((suma, duracion) => suma + duracion, 0) / duraciones.length;
  const maximo = Math.max(...duraciones);
  t.diagnostic(
    `${concurrentes ? "Concurrentes" : "Consecutivas"}: ${solicitudes.length} solicitudes; ` +
      `total=${tiempoTotal.toFixed(2)} ms, promedio=${promedio.toFixed(2)} ms/solicitud, ` +
      `máximo=${maximo.toFixed(2)} ms`,
  );

  assert.ok(Number.isFinite(tiempoTotal) && tiempoTotal >= 0);
  assert.ok(Number.isFinite(promedio) && promedio >= 0);
  assert.ok(Number.isFinite(maximo) && maximo >= 0);
  return { resultados, tiempoTotal, promedio, maximo };
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
      error: "Confirma tu correo con el código que te enviamos antes de crear la cuenta.",
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

test("mide 3000 registros consecutivos sin verificar y confirma que no llaman al backend", async (t) => {
  configurarApi();
  let llamadasBackend = 0;
  globalThis.fetch = async () => {
    llamadasBackend++;
    return Response.json({}, { status: 201 });
  };

  const solicitudes = Array.from({ length: CANTIDAD_REGISTROS_CARGA }, () =>
    crearSolicitudRegistro(),
  );
  const medicion = await medirSolicitudes(t, solicitudes);

  assert.equal(medicion.resultados.length, CANTIDAD_REGISTROS_CARGA);
  assert.ok(medicion.resultados.every(({ status }) => status === 403));
  assert.equal(llamadasBackend, 0);
});

test("mide 3000 registros concurrentes válidos e inválidos y cuenta las llamadas al backend", async (t) => {
  configurarApi();
  const cookie = await cookieVerificada();
  let llamadasBackend = 0;
  globalThis.fetch = async () => {
    llamadasBackend++;
    return Response.json({}, { status: 201 });
  };

  const solicitudes = Array.from({ length: CANTIDAD_REGISTROS_CARGA }, (_, indice) =>
    crearSolicitudRegistro(
      { idUsuario: String(12345 + indice) },
      indice % 2 === 0 ? cookie : undefined,
    ),
  );
  const medicion = await medirSolicitudes(t, solicitudes, { concurrentes: true });

  const validas = medicion.resultados.filter(({ status }) => status === 201);
  const invalidas = medicion.resultados.filter(({ status }) => status === 403);
  assert.equal(validas.length, CANTIDAD_REGISTROS_CARGA / 2);
  assert.equal(invalidas.length, CANTIDAD_REGISTROS_CARGA / 2);
  assert.equal(llamadasBackend, validas.length);
});

test("mantiene acotado el uso de memoria en ejecuciones repetidas de 100 registros", async (t) => {
  configurarApi();
  let llamadasBackend = 0;
  globalThis.fetch = async () => {
    llamadasBackend++;
    return Response.json({}, { status: 201 });
  };

  const ejecutarLote = async () => {
    const solicitudes = Array.from({ length: 100 }, () => crearSolicitudRegistro());
    const medicion = await medirSolicitudes(t, solicitudes);
    assert.ok(medicion.resultados.every(({ status }) => status === 403));
  };

  await ejecutarLote();
  const memoria = [];
  for (let repeticion = 0; repeticion < 5; repeticion++) {
    await ejecutarLote();
    await new Promise((resolver) => setImmediate(resolver));
    if (typeof globalThis.gc === "function") globalThis.gc();
    memoria.push(process.memoryUsage().heapUsed);
  }

  const variacion = Math.max(...memoria) - Math.min(...memoria);
  t.diagnostic(
    `Memoria heap en 5 repeticiones: variación=${(variacion / 1024 / 1024).toFixed(2)} MiB`,
  );
  assert.ok(
    variacion < 32 * 1024 * 1024,
    `La variación de memoria fue de ${(variacion / 1024 / 1024).toFixed(2)} MiB.`,
  );
  assert.equal(llamadasBackend, 0);
});
