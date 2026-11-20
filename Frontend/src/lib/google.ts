// Utilidades del flujo OpenID Connect con Google (código de autorización + PKCE).
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const COOKIE_OAUTH_GOOGLE = "google_oauth";
export const DURACION_OAUTH_SEGUNDOS = 60 * 10;

const URL_AUTORIZACION = "https://accounts.google.com/o/oauth2/v2/auth";
const URL_TOKEN = "https://oauth2.googleapis.com/token";
const URL_CLAVES = "https://www.googleapis.com/oauth2/v3/certs";
const EMISORES_GOOGLE = ["https://accounts.google.com", "accounts.google.com"];

export const MENSAJES_ERROR_GOOGLE: Record<string, string> = {
  cancelado: "Cancelaste el inicio de sesión con Google.",
  invalido: "No se pudo validar el inicio de sesión con Google. Inténtalo de nuevo.",
  sin_cuenta:
    "No existe una cuenta de Cozymov con ese correo. Con Google solo puedes registrarte usando tu correo @unicesar.edu.co; con otro correo institucional, usa el formulario de registro.",
  restringido:
    "Esa cuenta de Google no puede entrar. Usa tu correo institucional (.edu.co).",
  registro_vencido:
    "El tiempo para completar tu registro con Google venció. Vuelve a intentarlo.",
  configuracion: "El inicio de sesión con Google no está disponible en este momento.",
  error: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
};

export type ConfigGoogle = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

/**
 * Lee la configuración de Google desde variables del servidor.
 * @param origen Origen de la solicitud, usado si no hay GOOGLE_REDIRECT_URI.
 * @returns Configuración o null si faltan credenciales.
 */
export function obtenerConfigGoogle(origen: string): ConfigGoogle | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${origen}/api/auth/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Origen público de la app para las redirecciones del flujo. Si hay
 * GOOGLE_REDIRECT_URI se usa su origen (p. ej. https://cozymov.com), porque
 * detrás de un proxy el origen de la solicitud puede ser el interno.
 * @param origen Origen de la solicitud, usado como respaldo.
 * @param config Configuración de Google, si existe.
 * @returns Origen al que se redirige al usuario.
 */
export function origenPublico(origen: string, config: ConfigGoogle | null): string {
  if (!config) return origen;
  try {
    return new URL(config.redirectUri).origin;
  } catch {
    return origen;
  }
}

export type ParametrosOAuth = {
  state: string;
  nonce: string;
  verifier: string;
  challenge: string;
};

/**
 * Genera state, nonce y el par PKCE de una autorización.
 * @returns Valores aleatorios para una sola autorización.
 */
export function crearParametrosOAuth(): ParametrosOAuth {
  const verifier = randomBytes(48).toString("base64url");
  return {
    state: randomBytes(24).toString("base64url"),
    nonce: randomBytes(24).toString("base64url"),
    verifier,
    challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
}

/**
 * Construye la URL a la que se redirige al usuario para autenticarse en Google.
 * @param config Credenciales y callback.
 * @param parametros State, nonce y challenge PKCE.
 * @param correoSugerido Correo que Google preselecciona (login_hint); el
 *   callback igual comprueba que el correo devuelto sea ese.
 * @returns URL de autorización.
 */
export function construirUrlAutorizacion(
  config: ConfigGoogle,
  parametros: ParametrosOAuth,
  correoSugerido?: string,
): string {
  const url = new URL(URL_AUTORIZACION);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  // profile da nombres y apellidos para precargar el registro con Google.
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", parametros.state);
  url.searchParams.set("nonce", parametros.nonce);
  url.searchParams.set("code_challenge", parametros.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  if (correoSugerido) url.searchParams.set("login_hint", correoSugerido);
  return url.toString();
}

/**
 * Cambia el código de autorización por un ID token en el servidor de Google.
 * @param config Credenciales y callback.
 * @param codigo Código recibido en el callback.
 * @param verifier Verificador PKCE guardado al iniciar el flujo.
 * @returns ID token emitido por Google.
 */
export async function intercambiarCodigo(
  config: ConfigGoogle,
  codigo: string,
  verifier: string,
): Promise<string> {
  const respuesta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: codigo,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { id_token?: unknown }
    | null;
  if (!respuesta.ok || typeof cuerpo?.id_token !== "string" || !cuerpo.id_token) {
    throw new Error(`Google rechazó el intercambio del código (${respuesta.status}).`);
  }
  return cuerpo.id_token;
}

export type IdentidadGoogle = {
  sub: string;
  correo: string;
  emailVerificado: boolean;
  /** given_name de Google; vacío si no lo envía. */
  nombres: string;
  /** family_name de Google; vacío si no lo envía. */
  apellidos: string;
};

let clavesGoogle: JWTVerifyGetKey | undefined;

/**
 * Verifica firma, emisor, audiencia, expiración y nonce de un ID token de Google.
 * @param idToken Token recibido de Google.
 * @param clientId Client ID esperado como audiencia.
 * @param nonce Nonce generado al iniciar el flujo.
 * @param claves Origen de claves públicas (inyectable en pruebas).
 * @returns Identidad validada.
 */
export async function verificarIdTokenGoogle(
  idToken: string,
  clientId: string,
  nonce: string,
  claves?: JWTVerifyGetKey,
): Promise<IdentidadGoogle> {
  clavesGoogle ??= createRemoteJWKSet(new URL(URL_CLAVES));
  const { payload } = await jwtVerify(idToken, claves ?? clavesGoogle, {
    issuer: EMISORES_GOOGLE,
    audience: clientId,
  });

  if (payload.nonce !== nonce) throw new Error("El nonce no coincide.");
  const {
    sub,
    email,
    email_verified: verificado,
    given_name: nombres,
    family_name: apellidos,
  } = payload;
  if (typeof sub !== "string" || !sub) throw new Error("Falta el sub.");
  if (typeof email !== "string" || !email) throw new Error("Falta el correo.");

  return {
    sub,
    correo: email.trim().toLowerCase(),
    emailVerificado: verificado === true || verificado === "true",
    nombres: typeof nombres === "string" ? nombres.trim() : "",
    apellidos: typeof apellidos === "string" ? apellidos.trim() : "",
  };
}

/**
 * Extrae de un usuario devuelto por el backend los datos que van en la sesión.
 * @param usuario Cuerpo JSON de la respuesta del backend.
 * @returns Id, correo y nombre, o null si la respuesta no los trae bien formados.
 */
export function datosSesionDeUsuario(
  usuario: unknown,
): { id: string; correo: string; nombre: string } | null {
  if (typeof usuario !== "object" || usuario === null) return null;
  const datos = usuario as Record<string, unknown>;
  const id = datos.idPersonas ?? datos.IdPersonas;
  const correo = datos.correo ?? datos.Correo;
  const nombre = ["primerNombre", "segundoNombre", "primerApellido", "segundoApellido"]
    .map((campo) => datos[campo])
    .filter((parte): parte is string => typeof parte === "string" && parte.trim() !== "")
    .map((parte) => parte.trim())
    .join(" ");

  if (
    typeof id !== "number" ||
    !Number.isInteger(id) ||
    id <= 0 ||
    typeof correo !== "string" ||
    !correo ||
    !nombre
  ) {
    return null;
  }
  return { id: String(id), correo, nombre };
}
