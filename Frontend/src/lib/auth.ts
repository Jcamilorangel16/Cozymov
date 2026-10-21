import { SignJWT, jwtVerify } from "jose";
import { validarDatosSesion } from "../validaciones/autenticacion";

export const NOMBRE_COOKIE_SESION = "sesion";
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 2;

export type DatosSesion = {
  id: string;
  correo: string;
};

function obtenerSecretoSesion() {
  const secreto = process.env.SESSION_SECRET;

  if (!secreto) {
    throw new Error("SESSION_SECRET no está configurada.");
  }

  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(datos: DatosSesion) {
  return new SignJWT({ correo: datos.correo })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(datos.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .sign(obtenerSecretoSesion());
}

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
