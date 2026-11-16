import { NextResponse, type NextRequest } from "next/server";
import {
  DURACION_SESION_SEGUNDOS,
  firmarSesion,
  NOMBRE_COOKIE_SESION,
} from "../../../../../src/lib/auth";
import { getBackendApiConfig } from "../../../../../src/lib/backendApi";
import {
  COOKIE_OAUTH_GOOGLE,
  intercambiarCodigo,
  obtenerConfigGoogle,
  verificarIdTokenGoogle,
} from "../../../../../src/lib/google";

export const runtime = "nodejs";

type DatosOAuth = { state: string; nonce: string; verifier: string };

function leerCookieOAuth(valor: string | undefined): DatosOAuth | null {
  if (!valor) return null;
  try {
    const datos = JSON.parse(valor) as Partial<DatosOAuth>;
    return typeof datos.state === "string" &&
      typeof datos.nonce === "string" &&
      typeof datos.verifier === "string"
      ? (datos as DatosOAuth)
      : null;
  } catch {
    return null;
  }
}

/**
 * Recibe el callback de Google, valida la identidad en el servidor y, si hay
 * una cuenta Cozymov asociada, emite la misma cookie de sesión del login normal.
 * @param request Solicitud con code y state de Google.
 * @returns Redirección a la app o al login con un código de error.
 */
export async function GET(request: NextRequest) {
  const origen = request.nextUrl.origin;
  const fallar = (codigo: string) => {
    const respuesta = NextResponse.redirect(
      new URL(`/?google_error=${codigo}`, origen),
    );
    respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
    return respuesta;
  };

  const config = obtenerConfigGoogle(origen);
  const backend = getBackendApiConfig();
  if (!config || !backend || !process.env.SESSION_SECRET) {
    console.error("Falta configuración para el inicio de sesión con Google.");
    return fallar("configuracion");
  }

  const parametros = request.nextUrl.searchParams;
  if (parametros.get("error")) {
    return fallar(parametros.get("error") === "access_denied" ? "cancelado" : "error");
  }

  const guardado = leerCookieOAuth(request.cookies.get(COOKIE_OAUTH_GOOGLE)?.value);
  const codigo = parametros.get("code");
  if (!guardado || !codigo || parametros.get("state") !== guardado.state) {
    return fallar("invalido");
  }

  let identidad;
  try {
    const idToken = await intercambiarCodigo(config, codigo, guardado.verifier);
    identidad = await verificarIdTokenGoogle(idToken, config.clientId, guardado.nonce);
  } catch (error) {
    console.error("No se pudo validar la identidad de Google:", error);
    return fallar("invalido");
  }

  let respuestaApi: Response;
  try {
    respuestaApi = await fetch(`${backend.baseUrl}/api/Usuarios/LoginGoogle`, {
      method: "POST",
      headers: { ...backend.headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        Sub: identidad.sub,
        Correo: identidad.correo,
        EmailVerificado: identidad.emailVerificado,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo conectar con la API de login con Google:", error);
    return fallar("error");
  }

  if (!respuestaApi.ok) {
    if (respuestaApi.status === 404) return fallar("sin_cuenta");
    if (respuestaApi.status === 403 || respuestaApi.status === 409) {
      return fallar("restringido");
    }
    return fallar("error");
  }

  const usuario = (await respuestaApi.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const id = usuario?.idPersonas ?? usuario?.IdPersonas;
  const correo = usuario?.correo ?? usuario?.Correo;
  const nombre = ["primerNombre", "segundoNombre", "primerApellido", "segundoApellido"]
    .map((campo) => usuario?.[campo])
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
    return fallar("error");
  }

  try {
    const token = await firmarSesion({ id: String(id), correo, nombre });
    // La página intermedia copia el id al sessionStorage, como hace el login normal.
    const respuesta = NextResponse.redirect(new URL("/auth/google", origen));
    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_SESION_SEGUNDOS,
    });
    respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
    return respuesta;
  } catch (error) {
    console.error("No se pudo crear la sesión del usuario:", error);
    return fallar("error");
  }
}
