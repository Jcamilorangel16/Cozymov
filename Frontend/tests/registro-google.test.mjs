// Pruebas del registro con Google: dominio admitido, cookie de registro
// pendiente y ruta que crea la cuenta.
import assert from "node:assert/strict";
import { afterEach, before, beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";
import { SignJWT } from "jose";

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

mock.module("next/headers.js", {
  namedExports: { cookies: async () => ({ get: () => undefined }) },
});

let registro;
let auth;
let validaciones;
let ruta;
let NextRequest;

before(async () => {
  registro = await import("../src/lib/registroGoogle.ts");
  auth = await import("../src/lib/auth.ts");
  validaciones = await import("../src/features/register/validations/usuarios.ts");
  ruta = await import("../app/api/registro/google/route.ts");
  ({ NextRequest } = await import("next/server.js"));
});

const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  process.env.VITE_API_URL = "https://backend.example";
  process.env.INTERNAL_API_KEY = "api-interna-prueba";
});

afterEach(() => {
  globalThis.fetch = fetchOriginal;
  mock.timers.reset();
});

const pendiente = {
  sub: "109876543210987654321",
  correo: "ana@unicesar.edu.co",
  nombres: "Ana María",
  apellidos: "Díaz Pérez",
};

const datosFormulario = {
  idUsuario: "1065123456",
  primerNombre: "Ana",
  segundoNombre: "María",
  primerApellido: "Díaz",
  segundoApellido: "Pérez",
  edad: 21,
  ocupacion: "estudiante",
  telefono: "310-555-0000",
  contrasena: "ClaveGoogle1",
};

test("solo admite correos exactamente @unicesar.edu.co", () => {
  for (const correo of ["ana@unicesar.edu.co", " Ana@UNICESAR.edu.co "]) {
    assert.equal(registro.esCorreoRegistroGoogle(correo), true, correo);
  }
  for (const correo of [
    "ana@otra.edu.co",
    "ana@est.unicesar.edu.co",
    "ana@unicesar.edu.co.otro.com",
    "ana@gmail.com",
    "@unicesar.edu.co",
    "a@b@unicesar.edu.co",
    "ana maria@unicesar.edu.co",
  ]) {
    assert.equal(registro.esCorreoRegistroGoogle(correo), false, correo);
  }
});

test("separa nombres de Google en el primero y el resto", () => {
  assert.deepEqual(registro.separarNombres(" Ana  María José "), ["Ana", "María José"]);
  assert.deepEqual(registro.separarNombres("Ana"), ["Ana", ""]);
  assert.deepEqual(registro.separarNombres(""), ["", ""]);
});

test("la cookie de registro pendiente se verifica y conserva la identidad", async () => {
  const token = await registro.firmarRegistroGoogle(pendiente);
  // Sin proveedor explícito, la identidad es de Google.
  assert.deepEqual(await registro.verificarRegistroGoogle(token), {
    ...pendiente,
    proveedor: "google",
  });
  assert.equal(await registro.verificarRegistroGoogle(undefined), null);
  assert.equal(await registro.verificarRegistroGoogle(`${token}x`), null);

  const deMicrosoft = await registro.firmarRegistroGoogle({ ...pendiente, proveedor: "microsoft" });
  assert.equal((await registro.verificarRegistroGoogle(deMicrosoft)).proveedor, "microsoft");
});

test("la cookie de registro pendiente rechaza un proveedor desconocido", async () => {
  const token = await registro.firmarRegistroGoogle({ ...pendiente, proveedor: "github" });
  assert.equal(await registro.verificarRegistroGoogle(token), null);
});

test("la cookie de registro pendiente vence a los 15 minutos", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const token = await registro.firmarRegistroGoogle(pendiente);
  mock.timers.tick(registro.DURACION_REGISTRO_GOOGLE_SEGUNDOS * 1000 + 1000);
  assert.equal(await registro.verificarRegistroGoogle(token), null);
});

test("un token de registro no vale como sesión ni una sesión como registro", async () => {
  const tokenRegistro = await registro.firmarRegistroGoogle(pendiente);
  assert.equal(await auth.verificarSesion(tokenRegistro), null);

  const tokenSesion = await auth.firmarSesion({ id: "7", correo: pendiente.correo });
  assert.equal(await registro.verificarRegistroGoogle(tokenSesion), null);

  // Aunque tenga los mismos campos, la clave de sesión no firma registros.
  const conClaveDeSesion = await new SignJWT({ gsub: "x", correo: pendiente.correo })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("cozymov:registro-google")
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(SECRETO_PRUEBA));
  assert.equal(await registro.verificarRegistroGoogle(conClaveDeSesion), null);
});

test("la validación del registro con Google ignora el correo del cliente", () => {
  const resultado = validaciones.validarRegistroGoogle({
    ...datosFormulario,
    correo: "intruso@otra.edu.co",
  });
  assert.equal(resultado.valido, true);
  assert.equal("correo" in resultado.datos, false);
  assert.equal(resultado.datos.contrasena, "ClaveGoogle1");
});

test("el registro con Google exige una contraseña válida", () => {
  assert.equal(
    validaciones.validarRegistroGoogle({ ...datosFormulario, contrasena: undefined }).valido,
    false,
  );
  assert.match(
    validaciones.validarRegistroGoogle({ ...datosFormulario, contrasena: "corta12" }).error,
    /contraseña/i,
  );
});

test("el formulario de Google exige todos los campos y que las contraseñas coincidan", () => {
  const completa = { ...datosFormulario, edad: "21" };
  assert.equal(
    validaciones.validarFormularioRegistroGoogle(completa, "ClaveGoogle1").valido,
    true,
  );

  const incompleto = "Por favor, completa todos los campos.";
  for (const campo of ["primerNombre", "primerApellido", "idUsuario", "edad", "ocupacion", "telefono", "contrasena"]) {
    assert.deepEqual(
      validaciones.validarFormularioRegistroGoogle({ ...completa, [campo]: "" }, "ClaveGoogle1"),
      { valido: false, error: incompleto },
      campo,
    );
  }
  assert.deepEqual(validaciones.validarFormularioRegistroGoogle(completa, ""), {
    valido: false,
    error: incompleto,
  });
  assert.deepEqual(validaciones.validarFormularioRegistroGoogle(completa, "OtraClave1"), {
    valido: false,
    error: "Las contraseñas no coinciden.",
  });
});

function solicitud(cuerpo, token) {
  return new NextRequest("http://localhost/api/registro/google", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { cookie: `google_registro=${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
}

test("sin cookie de registro pendiente responde 401 y no llama al backend", async () => {
  let llamado = false;
  globalThis.fetch = async () => {
    llamado = true;
    return Response.json({});
  };

  const respuesta = await ruta.POST(solicitud(datosFormulario));

  assert.equal(respuesta.status, 401);
  assert.equal((await respuesta.json()).vencido, true);
  assert.equal(llamado, false);
});

test("crea la cuenta con el correo de Google e inicia sesión", async () => {
  let llamada;
  globalThis.fetch = async (url, init) => {
    llamada = { url, init };
    return Response.json(
      {
        idPersonas: 42,
        correo: pendiente.correo,
        primerNombre: "Ana",
        primerApellido: "Díaz",
      },
      { status: 201 },
    );
  };

  const respuesta = await ruta.POST(
    solicitud(
      { ...datosFormulario, correo: "intruso@otra.edu.co" },
      await registro.firmarRegistroGoogle(pendiente),
    ),
  );

  assert.equal(respuesta.status, 201);
  assert.equal(llamada.url, "https://backend.example/api/Usuarios/RegistroGoogle");
  assert.equal(llamada.init.headers["X-Internal-Api-Key"], "api-interna-prueba");
  const cuerpo = JSON.parse(llamada.init.body);
  assert.equal(cuerpo.Correo, pendiente.correo);
  assert.equal(cuerpo.Sub, pendiente.sub);
  assert.equal(cuerpo.Cedula, "1065123456");
  assert.equal(cuerpo.Telefono, "+573105550000");
  assert.equal(cuerpo.Contrasena, "ClaveGoogle1");

  const cookies = respuesta.headers.getSetCookie();
  const sesion = cookies.find((cookie) => cookie.startsWith("sesion="));
  assert.ok(sesion, "debe emitir la cookie de sesión");
  const datosSesion = await auth.verificarSesion(sesion.split(";")[0].slice("sesion=".length));
  assert.equal(datosSesion.id, "42");
  assert.equal(datosSesion.correo, pendiente.correo);
  assert.ok(
    cookies.some((cookie) => /^google_registro=;/.test(cookie)),
    "debe borrar la cookie de registro pendiente",
  );
});

test("con una identidad de Microsoft llama a RegistroMicrosoft e inicia sesión", async () => {
  let llamada;
  globalThis.fetch = async (url, init) => {
    llamada = { url, init };
    return Response.json(
      { idPersonas: 43, correo: pendiente.correo, primerNombre: "Ana", primerApellido: "Díaz" },
      { status: 201 },
    );
  };
  const subMicrosoft = "11111111-2222-3333-4444-555555555555:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  const respuesta = await ruta.POST(
    solicitud(
      // El cliente no puede elegir el proveedor: sale de la cookie firmada.
      { ...datosFormulario, proveedor: "google" },
      await registro.firmarRegistroGoogle({ ...pendiente, sub: subMicrosoft, proveedor: "microsoft" }),
    ),
  );

  assert.equal(respuesta.status, 201);
  assert.equal(llamada.url, "https://backend.example/api/Usuarios/RegistroMicrosoft");
  const cuerpo = JSON.parse(llamada.init.body);
  assert.equal(cuerpo.Sub, subMicrosoft);
  assert.equal(cuerpo.Correo, pendiente.correo);
  assert.ok(respuesta.headers.getSetCookie().some((cookie) => cookie.startsWith("sesion=")));
});

test("reenvía el conflicto del backend sin iniciar sesión", async () => {
  globalThis.fetch = async () =>
    new Response("Esa cédula ya está registrada.", { status: 409 });

  const respuesta = await ruta.POST(
    solicitud(datosFormulario, await registro.firmarRegistroGoogle(pendiente)),
  );

  assert.equal(respuesta.status, 409);
  assert.deepEqual(await respuesta.json(), { error: "Esa cédula ya está registrada." });
  assert.equal(
    respuesta.headers.getSetCookie().some((cookie) => cookie.startsWith("sesion=")),
    false,
  );
});
