// Firma y verifica cookies de sesión usadas por las rutas protegidas.
import { SignJWT, jwtVerify } from "jose";
import { validarDatosSesion } from "../features/login/validations/autenticacion";
import { cookies } from "next/headers";

export const NOMBRE_COOKIE_SESION = "sesion";
/**
 * La sesión queda iniciada en el dispositivo: un año, que es lo máximo que los navegadores
 * conservan una cookie. Cada vez que se abre el menú se renueva (`/api/sesion`), así que
 * quien usa la aplicación no vuelve a ver el inicio de sesión salvo que cierre sesión.
 */
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 365;

const LONGITUD_MINIMA_SECRETO = 32;
const ALGORITMO_SESION = "HS256";

export type DatosSesion = {
  id: string;
  correo: string;
  nombre?: string;
};

/**
 * Obtiene la clave configurada para firmar JWT de sesión.
 * @returns Secreto codificado para la librería jose.
 * @throws Error cuando SESSION_SECRET no está configurada.
 */
function obtenerSecretoSesion() {
  const secreto = process.env.SESSION_SECRET;

  if (!secreto) {
    throw new Error("SESSION_SECRET no está configurada.");
  }
  // HS256 es tan fuerte como su secreto: con uno corto, quien capture una
  // cookie puede adivinarlo sin conexión y fabricar sesiones de cualquier usuario.
  if (secreto.length < LONGITUD_MINIMA_SECRETO) {
    throw new Error(
      `SESSION_SECRET debe tener al menos ${LONGITUD_MINIMA_SECRETO} caracteres aleatorios.`,
    );
  }

  return new TextEncoder().encode(secreto);
}

/**
 * Crea un token firmado para la sesión del usuario.
 * @param datos Identidad del usuario que inicia sesión.
 * @returns Token JWT firmado con duración limitada.
 */
export async function firmarSesion(datos: DatosSesion) {
  return new SignJWT({
    correo: datos.correo,
    ...(datos.nombre ? { nombre: datos.nombre } : {}),
  })
    .setProtectedHeader({ alg: ALGORITMO_SESION })
    .setSubject(datos.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecretoSesion());
}

/**
 * Atributos de la cookie de sesión: inaccesible desde JavaScript, solo por HTTPS en
 * producción y con la duración de la sesión (cookie persistente, no de navegador).
 */
export function opcionesCookieSesion() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  };
}

/**
 * Verifica un token y devuelve los datos de sesión si son válidos.
 * @param token Token JWT recibido desde la cookie.
 * @returns Datos de sesión o null si el token no es válido.
 */
export async function verificarSesion(token: string): Promise<DatosSesion | null> {
  try {
    // Solo se acepta el algoritmo con el que se firma.
    const { payload } = await jwtVerify(token, obtenerSecretoSesion(), {
      algorithms: [ALGORITMO_SESION],
    });
    const id = payload.sub;
    const correo = payload.correo;

    const validacion = validarDatosSesion(id, correo);
    if (!validacion.valido) {
      return null;
    }

    return {
      ...validacion.datos,
      ...(typeof payload.nombre === "string" && payload.nombre.trim()
        ? { nombre: payload.nombre.trim() }
        : {}),
    };
  } catch {
    return null;
  }
}

export async function obtenerSesionActual(): Promise<DatosSesion | null> {
  const token = (await cookies()).get(NOMBRE_COOKIE_SESION)?.value;
  return token ? verificarSesion(token) : null;
}
