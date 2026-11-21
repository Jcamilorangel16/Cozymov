// Utilidades del flujo OpenID Connect con Microsoft Entra ID (cuentas de
// Outlook / Microsoft 365 institucionales), con código de autorización + PKCE.
//
// Solo se aceptan cuentas miembro de un único tenant configurado
// (MICROSOFT_TENANT_ID): el correo de esas cuentas lo administra la
// universidad, así que sirve para vincularlas con la cuenta Cozymov existente.
// Con "common" u "organizations" cualquier tenant podría emitir un token con un
// correo ajeno, por eso no se admiten.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { type ParametrosOAuth } from "./google.ts";

export const COOKIE_OAUTH_MICROSOFT = "microsoft_oauth";
export const RUTA_OAUTH_MICROSOFT = "/api/auth/microsoft";

const URL_BASE = "https://login.microsoftonline.com";
const FORMATO_TENANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const MENSAJES_ERROR_MICROSOFT: Record<string, string> = {
  cancelado: "Cancelaste el inicio de sesión con Microsoft.",
  invalido: "No se pudo validar el inicio de sesión con Microsoft. Inténtalo de nuevo.",
  sin_cuenta:
    "No existe una cuenta de Cozymov con ese correo. Con Microsoft solo puedes registrarte usando tu correo @unicesar.edu.co; con otro correo institucional, usa el formulario de registro.",
  restringido:
    "Esa cuenta de Microsoft no puede entrar. Usa tu cuenta institucional de Outlook (@unicesar.edu.co).",
  registro_vencido:
    "El tiempo para completar tu registro con Microsoft venció. Vuelve a intentarlo.",
  configuracion: "El inicio de sesión con Microsoft no está disponible en este momento.",
  error: "No se pudo iniciar sesión con Microsoft. Inténtalo de nuevo.",
};

export type ConfigMicrosoft = {
  clientId: string;
  clientSecret: string;
  /** GUID del tenant de la universidad, en minúsculas. */
  tenantId: string;
  redirectUri: string;
};

/**
 * Lee la configuración de Microsoft desde variables del servidor.
 * @param origen Origen de la solicitud, usado si no hay MICROSOFT_REDIRECT_URI.
 * @returns Configuración, o null si falta algo o el tenant no es un GUID.
 */
export function obtenerConfigMicrosoft(origen: string): ConfigMicrosoft | null {
  const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID?.trim().toLowerCase();
  if (!clientId || !clientSecret || !tenantId || !FORMATO_TENANT.test(tenantId)) {
    return null;
  }
  const redirectUri =
    process.env.MICROSOFT_REDIRECT_URI || `${origen}${RUTA_OAUTH_MICROSOFT}/callback`;
  return { clientId, clientSecret, tenantId, redirectUri };
}

/** Emisor exacto de los ID tokens v2.0 del tenant. */
function emisor(tenantId: string): string {
  return `${URL_BASE}/${tenantId}/v2.0`;
}

/**
 * Construye la URL de autorización de Microsoft para el tenant configurado.
 * response_mode=query hace que Microsoft vuelva con un GET: con form_post
 * llegaría un POST entre sitios, sin la cookie SameSite=Lax del flujo y
 * rechazado por la defensa CSRF de `proxy.ts`.
 * @param config Credenciales, tenant y callback.
 * @param parametros State, nonce y challenge PKCE.
 * @returns URL de autorización.
 */
export function construirUrlAutorizacionMicrosoft(
  config: ConfigMicrosoft,
  parametros: ParametrosOAuth,
): string {
  const url = new URL(`${URL_BASE}/${config.tenantId}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", parametros.state);
  url.searchParams.set("nonce", parametros.nonce);
  url.searchParams.set("code_challenge", parametros.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

/**
 * Cambia el código de autorización por un ID token en el servidor de Microsoft.
 * @param config Credenciales, tenant y callback.
 * @param codigo Código recibido en el callback.
 * @param verifier Verificador PKCE guardado al iniciar el flujo.
 * @returns ID token emitido por Microsoft.
 */
export async function intercambiarCodigoMicrosoft(
  config: ConfigMicrosoft,
  codigo: string,
  verifier: string,
): Promise<string> {
  const respuesta = await fetch(`${URL_BASE}/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: codigo,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
      scope: "openid email profile",
    }),
    cache: "no-store",
  });
  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { id_token?: unknown }
    | null;
  if (!respuesta.ok || typeof cuerpo?.id_token !== "string" || !cuerpo.id_token) {
    throw new Error(`Microsoft rechazó el intercambio del código (${respuesta.status}).`);
  }
  return cuerpo.id_token;
}

export type IdentidadMicrosoft = {
  /** `tid:oid`: identidad estable del usuario dentro del tenant. */
  sub: string;
  correo: string;
  /** true si es una cuenta invitada (B2B) y no un miembro del tenant. */
  invitado: boolean;
  /** given_name; vacío si Entra no lo envía (es un claim opcional). */
  nombres: string;
  /** family_name; vacío si Entra no lo envía. */
  apellidos: string;
};

const clavesPorTenant = new Map<string, JWTVerifyGetKey>();

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Verifica firma, emisor, audiencia, expiración, nonce y tenant de un ID token
 * de Microsoft, y extrae la identidad.
 * @param idToken Token recibido de Microsoft.
 * @param config Client ID esperado como audiencia y tenant autorizado.
 * @param nonce Nonce generado al iniciar el flujo.
 * @param claves Origen de claves públicas (inyectable en pruebas).
 * @returns Identidad validada.
 */
export async function verificarIdTokenMicrosoft(
  idToken: string,
  config: Pick<ConfigMicrosoft, "clientId" | "tenantId">,
  nonce: string,
  claves?: JWTVerifyGetKey,
): Promise<IdentidadMicrosoft> {
  let jwks = claves ?? clavesPorTenant.get(config.tenantId);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${URL_BASE}/${config.tenantId}/discovery/v2.0/keys`));
    clavesPorTenant.set(config.tenantId, jwks);
  }
  const emisorEsperado = emisor(config.tenantId);
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: emisorEsperado,
    audience: config.clientId,
    algorithms: ["RS256"],
  });

  if (payload.nonce !== nonce) throw new Error("El nonce no coincide.");
  const tid = texto(payload.tid).toLowerCase();
  if (tid !== config.tenantId) throw new Error("El token es de otro tenant.");
  const oid = texto(payload.oid).toLowerCase();
  if (!oid) throw new Error("Falta el oid.");

  // email requiere el scope email y que la cuenta tenga buzón; si falta, el
  // UPN (preferred_username) de una cuenta miembro usa un dominio verificado
  // del tenant.
  const correo = (texto(payload.email) || texto(payload.preferred_username)).toLowerCase();
  if (!correo.includes("@")) throw new Error("Falta el correo.");

  // idp solo difiere del emisor cuando la cuenta viene de otro proveedor
  // (invitados B2B, cuentas personales invitadas). Su correo no lo controla
  // la universidad.
  const idp = texto(payload.idp);
  const invitado =
    idp !== "" && idp !== emisorEsperado && idp !== `https://sts.windows.net/${tid}/`;

  return {
    sub: `${tid}:${oid}`,
    correo,
    invitado,
    nombres: texto(payload.given_name),
    apellidos: texto(payload.family_name),
  };
}
