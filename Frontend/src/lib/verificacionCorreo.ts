// Verificación del correo antes del registro con contraseña. El usuario la
// obtiene de dos formas: con el código de 6 dígitos que se le envía por correo
// (`/api/verificacion-correo`) o entrando con Google usando ese correo (el
// callback). En ambos casos se firma el correo en una cookie de corta
// duración; sin ella, /api/registro no crea la cuenta.
// No importa nada de next/* para poder usarse desde rutas probadas con node.
import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const COOKIE_CORREO_VERIFICADO = "correo_verificado";
export const DURACION_CORREO_VERIFICADO_SEGUNDOS = 60 * 30;

const ALGORITMO = "HS256";
const AUDIENCIA = "cozymov:verificacion-correo";
const LONGITUD_MINIMA_SECRETO = 32;

/** Mensajes para los códigos de `?verificacion_error=` en /register. */
export const MENSAJES_ERROR_VERIFICACION: Record<string, string> = {
  no_coincide:
    "La cuenta de Google que elegiste no es la del correo que escribiste. Entra con la cuenta de Google de ese correo.",
  no_verificado: "Google no ha confirmado ese correo. Usa una cuenta con el correo verificado.",
  correo_invalido: "Escribe un correo institucional válido antes de verificarlo.",
  cancelado: "Cancelaste la verificación con Google.",
  invalido: "No se pudo verificar el correo con Google. Inténtalo de nuevo.",
  configuracion: "La verificación con Google no está disponible en este momento.",
  error: "No se pudo verificar el correo con Google. Inténtalo de nuevo.",
};

/** `sub` solo existe si el correo se verificó con Google. */
export type CorreoVerificado = { correo: string; sub?: string };

/**
 * Clave para firmar el correo verificado, derivada de SESSION_SECRET. Es
 * distinta de la de sesión y de la del registro con Google, así que un token
 * nunca vale por otro.
 * @returns Clave HMAC para jose.
 */
function claveVerificacion(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < LONGITUD_MINIMA_SECRETO) {
    throw new Error("SESSION_SECRET no está configurada o es demasiado corta.");
  }
  return new Uint8Array(createHmac("sha256", secreto).update(AUDIENCIA).digest());
}

/**
 * Firma el correo que el usuario demostró como propio (código o Google).
 * @param datos Correo normalizado y, si fue con Google, su sub.
 * @returns Token para la cookie `correo_verificado`.
 */
export async function firmarCorreoVerificado(datos: CorreoVerificado): Promise<string> {
  return new SignJWT({ correo: datos.correo, ...(datos.sub ? { gsub: datos.sub } : {}) })
    .setProtectedHeader({ alg: ALGORITMO })
    .setAudience(AUDIENCIA)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_CORREO_VERIFICADO_SEGUNDOS}s`)
    .sign(claveVerificacion());
}

/**
 * Verifica la cookie de correo verificado.
 * @param token Valor de la cookie, si existe.
 * @returns Correo (y sub si fue con Google), o null si falta, venció o no es válida.
 */
export async function verificarCorreoVerificado(
  token: string | undefined,
): Promise<CorreoVerificado | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, claveVerificacion(), {
      algorithms: [ALGORITMO],
      audience: AUDIENCIA,
    });
    const { correo, gsub } = payload;
    if (typeof correo !== "string" || !correo || (gsub !== undefined && typeof gsub !== "string")) {
      return null;
    }
    return gsub ? { correo, sub: gsub } : { correo };
  } catch {
    return null;
  }
}

/** Atributos de la cookie: la leen la página /register y la ruta /api/registro. */
export function opcionesCookieCorreoVerificado() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DURACION_CORREO_VERIFICADO_SEGUNDOS,
  };
}

/**
 * Cabecera Set-Cookie que fija la cookie de correo verificado, para rutas que
 * responden con un Response normal.
 * @param token Token firmado con firmarCorreoVerificado.
 * @returns Valor de la cabecera.
 */
export function cabeceraCorreoVerificado(token: string): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_CORREO_VERIFICADO}=${token}; Path=/; Max-Age=${DURACION_CORREO_VERIFICADO_SEGUNDOS}; HttpOnly; SameSite=Lax${seguro}`;
}

/**
 * Cabecera Set-Cookie que borra la cookie de correo verificado, para rutas que
 * responden con un Response normal.
 * @returns Valor de la cabecera.
 */
export function cabeceraBorrarCorreoVerificado(): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_CORREO_VERIFICADO}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${seguro}`;
}

/**
 * Lee una cookie de la cabecera Cookie de una solicitud estándar.
 * @param request Solicitud entrante.
 * @param nombre Nombre de la cookie.
 * @returns Valor decodificado o undefined si no está.
 */
export function leerCookie(request: Request, nombre: string): string | undefined {
  for (const parte of (request.headers.get("cookie") ?? "").split(";")) {
    const separador = parte.indexOf("=");
    if (separador === -1 || parte.slice(0, separador).trim() !== nombre) continue;
    try {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
