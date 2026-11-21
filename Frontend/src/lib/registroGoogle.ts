// Registro pendiente con un proveedor externo (Google o Microsoft): la
// identidad que el callback validó viaja en una cookie firmada y de corta
// duración hasta que el usuario completa los datos que el proveedor no da
// (cédula, edad, ocupación). El nombre "Google" se conserva por historia: la
// cookie y la página `/register/google` sirven a ambos proveedores.
import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

/** Único dominio con el que se puede crear una cuenta usando Google o Microsoft. */
export const DOMINIO_REGISTRO_GOOGLE = "unicesar.edu.co";
export const COOKIE_REGISTRO_GOOGLE = "google_registro";
export const DURACION_REGISTRO_GOOGLE_SEGUNDOS = 60 * 15;

const ALGORITMO = "HS256";
const AUDIENCIA = "cozymov:registro-google";
const LONGITUD_MINIMA_SECRETO = 32;
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+$/;

export type ProveedorRegistro = "google" | "microsoft";

/** Nombre visible de cada proveedor, para textos de la interfaz. */
export const NOMBRE_PROVEEDOR: Record<ProveedorRegistro, string> = {
  google: "Google",
  microsoft: "Microsoft",
};

export type RegistroGooglePendiente = {
  /** Proveedor que validó la identidad; si falta al firmar, Google. */
  proveedor?: ProveedorRegistro;
  sub: string;
  correo: string;
  nombres: string;
  apellidos: string;
};

/**
 * Indica si el correo pertenece exactamente al dominio admitido (sin
 * subdominios ni sufijos como "unicesar.edu.co.otro.com").
 * @param correo Correo que Google devolvió.
 * @returns Si con ese correo se puede crear una cuenta con Google.
 */
export function esCorreoRegistroGoogle(correo: string): boolean {
  const normalizado = correo.trim().toLowerCase();
  return (
    FORMATO_CORREO.test(normalizado) &&
    normalizado.endsWith(`@${DOMINIO_REGISTRO_GOOGLE}`)
  );
}

/**
 * Clave para firmar el registro pendiente, derivada de SESSION_SECRET. Al ser
 * distinta de la de sesión, un token de registro nunca vale como sesión.
 * @returns Clave HMAC para jose.
 */
function claveRegistro(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < LONGITUD_MINIMA_SECRETO) {
    throw new Error("SESSION_SECRET no está configurada o es demasiado corta.");
  }
  return new Uint8Array(createHmac("sha256", secreto).update(AUDIENCIA).digest());
}

/**
 * Firma la identidad de Google validada para completar el registro después.
 * @param datos Identidad y nombres que devolvió Google.
 * @returns Token para la cookie de registro pendiente.
 */
export async function firmarRegistroGoogle(datos: RegistroGooglePendiente): Promise<string> {
  return new SignJWT({
    proveedor: datos.proveedor ?? "google",
    gsub: datos.sub,
    correo: datos.correo,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
  })
    .setProtectedHeader({ alg: ALGORITMO })
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_REGISTRO_GOOGLE_SEGUNDOS}s`)
    .sign(claveRegistro());
}

/**
 * Verifica la cookie de registro pendiente.
 * @param token Valor de la cookie, si existe.
 * @returns Identidad de Google o null si falta, venció o no es válida.
 */
export async function verificarRegistroGoogle(
  token: string | undefined,
): Promise<Required<RegistroGooglePendiente> | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, claveRegistro(), {
      algorithms: [ALGORITMO],
      audience: AUDIENCIA,
    });
    const { proveedor = "google", gsub, correo, nombres, apellidos } = payload;
    if (
      (proveedor !== "google" && proveedor !== "microsoft") ||
      typeof gsub !== "string" ||
      !gsub ||
      typeof correo !== "string" ||
      !esCorreoRegistroGoogle(correo)
    ) {
      return null;
    }
    return {
      proveedor,
      sub: gsub,
      correo,
      nombres: typeof nombres === "string" ? nombres : "",
      apellidos: typeof apellidos === "string" ? apellidos : "",
    };
  } catch {
    return null;
  }
}

/**
 * Atributos de la cookie de registro pendiente. Usa la ruta raíz porque la
 * leen la página `/register/google` y la ruta `/api/registro/google`.
 */
export function opcionesCookieRegistroGoogle() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DURACION_REGISTRO_GOOGLE_SEGUNDOS,
  };
}

/**
 * Separa los nombres (o apellidos) de Google en el primero y el resto, para
 * precargar el formulario. El usuario puede corregirlos antes de enviar.
 * @param texto Nombres o apellidos tal como los da Google.
 * @returns Primer valor y resto, cada uno de máximo 50 caracteres.
 */
export function separarNombres(texto: string): [string, string] {
  const partes = texto.trim().split(/\s+/).filter(Boolean);
  return [(partes[0] ?? "").slice(0, 50), partes.slice(1).join(" ").slice(0, 50)];
}
