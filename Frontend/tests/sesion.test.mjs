// Pruebas de la sesión permanente del dispositivo: duración, cookie persistente y renovación.
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
process.env.SESSION_SECRET = SECRETO_PRUEBA;
const UN_ANIO = 60 * 60 * 24 * 365;

let cookieSesion = null;
mock.module("next/headers.js", {
  namedExports: {
    cookies: async () => ({
      get: (nombre) => (nombre === "sesion" && cookieSesion ? { value: cookieSesion } : undefined),
    }),
  },
});

let auth;
let sesionRoute;

before(async () => {
  auth = await import("../src/lib/auth.ts");
  sesionRoute = await import("../app/api/sesion/route.ts");
});

const entornoOriginal = { ...process.env };

beforeEach(() => {
  process.env.SESSION_SECRET = SECRETO_PRUEBA;
  cookieSesion = null;
});

afterEach(() => {
  for (const nombre of ["NODE_ENV"]) {
    if (entornoOriginal[nombre] === undefined) delete process.env[nombre];
    else process.env[nombre] = entornoOriginal[nombre];
  }
});

function cargaDelToken(token) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
}

const datos = { id: "7", correo: "ana@unicesar.edu.co", nombre: "Ana Díaz" };

test("la sesión dura un año", async () => {
  assert.equal(auth.DURACION_SESION_SEGUNDOS, UN_ANIO);
  const { iat, exp } = cargaDelToken(await auth.firmarSesion(datos));
  assert.equal(exp - iat, UN_ANIO);
});

test("la cookie de sesión es persistente, httpOnly y SameSite=Lax", () => {
  process.env.NODE_ENV = "development";
  assert.deepEqual(auth.opcionesCookieSesion(), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: UN_ANIO,
  });
  process.env.NODE_ENV = "production";
  assert.equal(auth.opcionesCookieSesion().secure, true);
});

test("renovar sin sesión responde 401 y no emite cookie", async () => {
  const res = await sesionRoute.POST();
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("set-cookie"), null);
});

test("renovar con una cookie manipulada o inválida responde 401", async () => {
  cookieSesion = `${await auth.firmarSesion(datos)}x`;
  assert.equal((await sesionRoute.POST()).status, 401);
  cookieSesion = "no-es-un-token";
  assert.equal((await sesionRoute.POST()).status, 401);
});

test("renovar con sesión válida emite una cookie nueva de un año para el mismo usuario", async () => {
  cookieSesion = await auth.firmarSesion(datos);

  const res = await sesionRoute.POST();

  assert.equal(res.status, 200);
  const cabecera = res.headers.get("set-cookie");
  assert.match(cabecera, /^sesion=/);
  assert.match(cabecera, new RegExp(`Max-Age=${UN_ANIO}`));
  assert.match(cabecera, /HttpOnly/i);
  assert.match(cabecera, /SameSite=lax/i);
  assert.match(cabecera, /Path=\//);

  const tokenNuevo = cabecera.split(";")[0].slice("sesion=".length);
  const sesion = await auth.verificarSesion(tokenNuevo);
  assert.equal(sesion.id, "7");
  assert.equal(sesion.correo, "ana@unicesar.edu.co");
  assert.equal(sesion.nombre, "Ana Díaz");
});

test("una sesión vencida no se puede renovar", async () => {
  // Token firmado con el mismo secreto pero ya expirado.
  const { SignJWT } = await import("jose");
  cookieSesion = await new SignJWT({ correo: datos.correo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(datos.id)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(SECRETO_PRUEBA));

  assert.equal((await sesionRoute.POST()).status, 401);
});
