import { NextResponse, type NextRequest } from "next/server";
import {
  firmarSesion,
  NOMBRE_COOKIE_SESION,
  opcionesCookieSesion,
} from "../../../../../src/lib/auth";
import { getBackendApiConfig } from "../../../../../src/lib/backendApi";
import {
  COOKIE_OAUTH_GOOGLE,
  datosSesionDeUsuario,
  intercambiarCodigo,
  obtenerConfigGoogle,
  origenPublico,
  verificarIdTokenGoogle,
} from "../../../../../src/lib/google";
import {
  COOKIE_REGISTRO_GOOGLE,
  esCorreoRegistroGoogle,
  firmarRegistroGoogle,
  opcionesCookieRegistroGoogle,
} from "../../../../../src/lib/registroGoogle";
import {
  COOKIE_CORREO_VERIFICADO,
  firmarCorreoVerificado,
  opcionesCookieCorreoVerificado,
} from "../../../../../src/lib/verificacionCorreo";

export const runtime = "nodejs";

/** `verificar` solo existe si el flujo confirma el correo del registro. */
type DatosOAuth = { state: string; nonce: string; verifier: string; verificar?: string };

function leerCookieOAuth(valor: string | undefined): DatosOAuth | null {
  if (!valor) return null;
  try {
    const datos = JSON.parse(valor) as Partial<DatosOAuth>;
    return typeof datos.state === "string" &&
      typeof datos.nonce === "string" &&
      typeof datos.verifier === "string" &&
      (datos.verificar === undefined || typeof datos.verificar === "string")
      ? (datos as DatosOAuth)
      : null;
  } catch {
    return null;
  }
}

/**
 * Recibe el callback de Google y valida la identidad en el servidor.
 * - Si el flujo verifica el correo del registro, comprueba que Google devolvió
 *   ese mismo correo verificado, lo firma en la cookie `correo_verificado` y
 *   vuelve a `/register`. No inicia sesión.
 * - Si no, y hay una cuenta Cozymov asociada, emite la misma cookie de sesión
 *   del login normal. Si no la hay y el correo es @unicesar.edu.co, guarda la
 *   identidad en una cookie firmada y lleva a `/register/google`.
 * @param request Solicitud con code y state de Google.
 * @returns Redirección a la app o a la pantalla de origen con un código de error.
 */
export async function GET(request: NextRequest) {
  const config = obtenerConfigGoogle(request.nextUrl.origin);
  const origen = origenPublico(request.nextUrl.origin, config);
  const guardado = leerCookieOAuth(request.cookies.get(COOKIE_OAUTH_GOOGLE)?.value);
  const destinoError = guardado?.verificar
    ? "/register?verificacion_error="
    : "/?google_error=";
  const fallar = (codigo: string) => {
    const respuesta = NextResponse.redirect(new URL(`${destinoError}${codigo}`, origen));
    respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
    return respuesta;
  };

  const backend = getBackendApiConfig();
  if (!config || !backend || !process.env.SESSION_SECRET) {
    console.error("Falta configuración para el inicio de sesión con Google.");
    return fallar("configuracion");
  }

  const parametros = request.nextUrl.searchParams;
  if (parametros.get("error")) {
    return fallar(parametros.get("error") === "access_denied" ? "cancelado" : "error");
  }

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

  if (guardado.verificar) {
    if (!identidad.emailVerificado) return fallar("no_verificado");
    if (identidad.correo !== guardado.verificar) return fallar("no_coincide");
    try {
      const token = await firmarCorreoVerificado({
        correo: identidad.correo,
        sub: identidad.sub,
      });
      const respuesta = NextResponse.redirect(new URL("/register", origen));
      respuesta.cookies.set(COOKIE_CORREO_VERIFICADO, token, opcionesCookieCorreoVerificado());
      respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
      return respuesta;
    } catch (error) {
      console.error("No se pudo firmar el correo verificado:", error);
      return fallar("error");
    }
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
    if (respuestaApi.status === 404) {
      // Sin cuenta: solo un correo verificado @unicesar.edu.co puede crearla con Google.
      if (!identidad.emailVerificado || !esCorreoRegistroGoogle(identidad.correo)) {
        return fallar("sin_cuenta");
      }
      try {
        const token = await firmarRegistroGoogle({
          sub: identidad.sub,
          correo: identidad.correo,
          nombres: identidad.nombres,
          apellidos: identidad.apellidos,
        });
        const respuesta = NextResponse.redirect(new URL("/register/google", origen));
        respuesta.cookies.set(COOKIE_REGISTRO_GOOGLE, token, opcionesCookieRegistroGoogle());
        respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
        return respuesta;
      } catch (error) {
        console.error("No se pudo preparar el registro con Google:", error);
        return fallar("error");
      }
    }
    if (respuestaApi.status === 403 || respuestaApi.status === 409) {
      return fallar("restringido");
    }
    return fallar("error");
  }

  const sesion = datosSesionDeUsuario(await respuestaApi.json().catch(() => null));
  if (!sesion) {
    return fallar("error");
  }

  try {
    const token = await firmarSesion(sesion);
    // La página intermedia copia el id al sessionStorage, como hace el login normal.
    const respuesta = NextResponse.redirect(new URL("/auth/google", origen));
    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    respuesta.cookies.delete({ name: COOKIE_OAUTH_GOOGLE, path: "/api/auth/google" });
    return respuesta;
  } catch (error) {
    console.error("No se pudo crear la sesión del usuario:", error);
    return fallar("error");
  }
}
