// Firma y verifica cookies de sesión usadas por las rutas protegidas.
import { SignJWT, jwtVerify } from "jose";
import { validarDatosSesion } from "../features/login/validations/autenticacion";
import { cookies } from "next/headers";

export const NOMBRE_COOKIE_SESION = "sesion";
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 2;

export type DatosSesion = {
  id: string;
  correo: string;
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

  return new TextEncoder().encode(secreto);
}

/**
 * Crea un token firmado para la sesión del usuario.
 * @param datos Identidad del usuario que inicia sesión.
 * @returns Token JWT firmado con duración limitada.
 */
export async function firmarSesion(datos: DatosSesion) {
  return new SignJWT({ correo: datos.correo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(datos.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecretoSesion());
}

/**
 * Verifica un token y devuelve los datos de sesión si son válidos.
 * @param token Token JWT recibido desde la cookie.
 * @returns Datos de sesión o null si el token no es válido.
 */
export async function verificarSesion(token: string): Promise<DatosSesion | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerSecretoSesion());
    const id = payload.sub;
    const correo = payload.correo;

    const validacion = validarDatosSesion(id, correo);
    if (!validacion.valido) {
      return null;
    }

    return validacion.datos;
  } catch {
    return null;
  }
}

export async function obtenerSesionActual(): Promise<DatosSesion | null> {
  const token = (await cookies()).get(NOMBRE_COOKIE_SESION)?.value;
  return token ? verificarSesion(token) : null;
}
