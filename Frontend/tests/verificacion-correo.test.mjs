// Pruebas de la cookie firmada que prueba que el correo del registro es del usuario.
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { SignJWT } from "jose";
import {
  cabeceraBorrarCorreoVerificado,
  DURACION_CORREO_VERIFICADO_SEGUNDOS,
  firmarCorreoVerificado,
  leerCookie,
  verificarCorreoVerificado,
} from "../src/lib/verificacionCorreo.ts";
import { firmarRegistroGoogle, verificarRegistroGoogle } from "../src/lib/registroGoogle.ts";
import { validarCorreoRegistro } from "../src/features/register/validations/usuarios.ts";

const SECRETO_PRUEBA = "secreto-de-prueba-no-real-con-longitud-suficiente";
const verificado = { correo: "ana@uni.edu.co", sub: "1234567890" };

beforeEach(() => {
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
});

afterEach(() => {
  mock.timers.reset();
});

test("el token conserva correo y sub, y rechaza tokens alterados o ausentes", async () => {
  const token = await firmarCorreoVerificado(verificado);
  assert.deepEqual(await verificarCorreoVerificado(token), verificado);
  assert.equal(await verificarCorreoVerificado(undefined), null);
  assert.equal(await verificarCorreoVerificado(`${token}x`), null);
});

test("el token vence a los 30 minutos", async () => {
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const token = await firmarCorreoVerificado(verificado);
  mock.timers.tick(DURACION_CORREO_VERIFICADO_SEGUNDOS * 1000 + 1000);
  assert.equal(await verificarCorreoVerificado(token), null);
});

test("un correo verificado no vale como registro con Google ni al revés", async () => {
  assert.equal(await verificarRegistroGoogle(await firmarCorreoVerificado(verificado)), null);
  assert.equal(
    await verificarCorreoVerificado(
      await firmarRegistroGoogle({ sub: "x", correo: "ana@unicesar.edu.co", nombres: "", apellidos: "" }),
    ),
    null,
  );

  // Con la clave de sesión no se puede fabricar un correo verificado.
  const conClaveDeSesion = await new SignJWT({ correo: verificado.correo, gsub: "x" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("cozymov:verificacion-correo")
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(SECRETO_PRUEBA));
  assert.equal(await verificarCorreoVerificado(conClaveDeSesion), null);
});

test("leerCookie toma el valor exacto de la cookie pedida", () => {
  const solicitud = new Request("http://localhost/", {
    headers: { cookie: "otra_correo_verificado=no; correo_verificado=abc%3D; sesion=s" },
  });
  assert.equal(leerCookie(solicitud, "correo_verificado"), "abc=");
  assert.equal(leerCookie(solicitud, "falta"), undefined);
  assert.equal(leerCookie(new Request("http://localhost/"), "correo_verificado"), undefined);
});

test("la cabecera de borrado expira la cookie en la ruta raíz", () => {
  const cabecera = cabeceraBorrarCorreoVerificado();
  assert.match(cabecera, /^correo_verificado=;/);
  assert.match(cabecera, /Path=\//);
  assert.match(cabecera, /Max-Age=0/);
  assert.match(cabecera, /HttpOnly/);
});

test("validarCorreoRegistro normaliza el correo que se manda a verificar", () => {
  assert.deepEqual(validarCorreoRegistro(" Ana@Uni.EDU.co "), {
    valido: true,
    datos: "ana@uni.edu.co",
  });
  assert.equal(validarCorreoRegistro("").valido, false);
  assert.equal(validarCorreoRegistro("sin-arroba").valido, false);
  assert.equal(validarCorreoRegistro(`${"a".repeat(150)}@uni.edu.co`).valido, false);
});
