import { NextResponse, type NextRequest } from "next/server";
import {
  firmarSesion,
  NOMBRE_COOKIE_SESION,
  opcionesCookieSesion,
} from "../../../../../src/lib/auth";
import { getBackendApiConfig } from "../../../../../src/lib/backendApi";
import { datosSesionDeUsuario, origenPublico } from "../../../../../src/lib/google";
import {
  COOKIE_OAUTH_MICROSOFT,
  intercambiarCodigoMicrosoft,
  obtenerConfigMicrosoft,
  RUTA_OAUTH_MICROSOFT,
  verificarIdTokenMicrosoft,
} from "../../../../../src/lib/microsoft";
import {
  COOKIE_REGISTRO_GOOGLE,
  esCorreoRegistroGoogle,
  firmarRegistroGoogle,
  opcionesCookieRegistroGoogle,
} from "../../../../../src/lib/registroGoogle";

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
 * Recibe el callback de Microsoft, valida la identidad en el servidor y, si
 * hay una cuenta Cozymov asociada, emite la misma cookie de sesión del login
 * normal. Si no la hay y el correo es @unicesar.edu.co, guarda la identidad en
 * la cookie firmada de registro pendiente y lleva a `/register/microsoft`.
 * @param request Solicitud con code y state de Microsoft.
 * @returns Redirección a la app o al login con un código de error.
 */
export async function GET(request: NextRequest) {
  const config = obtenerConfigMicrosoft(request.nextUrl.origin);
  const origen = origenPublico(request.nextUrl.origin, config);
  const fallar = (codigo: string) => {
    const respuesta = NextResponse.redirect(new URL(`/?microsoft_error=${codigo}`, origen));
    respuesta.cookies.delete({ name: COOKIE_OAUTH_MICROSOFT, path: RUTA_OAUTH_MICROSOFT });
    return respuesta;
  };

  const backend = getBackendApiConfig();
  if (!config || !backend || !process.env.SESSION_SECRET) {
    console.error("Falta configuración para el inicio de sesión con Microsoft.");
    return fallar("configuracion");
  }

  const parametros = request.nextUrl.searchParams;
  const errorProveedor = parametros.get("error");
  if (errorProveedor) {
    // access_denied: el usuario canceló. consent_required / interaction_required
    // suelen indicar que la universidad no aprobó la aplicación.
    if (errorProveedor !== "access_denied") {
      console.error(`Microsoft devolvió el error ${errorProveedor.slice(0, 60)}.`);
    }
    return fallar(errorProveedor === "access_denied" ? "cancelado" : "error");
  }

  const guardado = leerCookieOAuth(request.cookies.get(COOKIE_OAUTH_MICROSOFT)?.value);
  const codigo = parametros.get("code");
  if (!guardado || !codigo || parametros.get("state") !== guardado.state) {
    return fallar("invalido");
  }

  let identidad;
  try {
    const idToken = await intercambiarCodigoMicrosoft(config, codigo, guardado.verifier);
    identidad = await verificarIdTokenMicrosoft(idToken, config, guardado.nonce);
  } catch (error) {
    console.error("No se pudo validar la identidad de Microsoft:", error);
    return fallar("invalido");
  }

  if (identidad.invitado) return fallar("restringido");

  let respuestaApi: Response;
  try {
    respuestaApi = await fetch(`${backend.baseUrl}/api/Usuarios/LoginMicrosoft`, {
      method: "POST",
      headers: { ...backend.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ Sub: identidad.sub, Correo: identidad.correo }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo conectar con la API de login con Microsoft:", error);
    return fallar("error");
  }

  if (!respuestaApi.ok) {
    if (respuestaApi.status === 404) {
      // Sin cuenta: solo un correo @unicesar.edu.co puede crearla con Microsoft.
      if (!esCorreoRegistroGoogle(identidad.correo)) return fallar("sin_cuenta");
      try {
        const token = await firmarRegistroGoogle({
          proveedor: "microsoft",
          sub: identidad.sub,
          correo: identidad.correo,
          nombres: identidad.nombres,
          apellidos: identidad.apellidos,
        });
        const respuesta = NextResponse.redirect(new URL("/register/microsoft", origen));
        respuesta.cookies.set(COOKIE_REGISTRO_GOOGLE, token, opcionesCookieRegistroGoogle());
        respuesta.cookies.delete({ name: COOKIE_OAUTH_MICROSOFT, path: RUTA_OAUTH_MICROSOFT });
        return respuesta;
      } catch (error) {
        console.error("No se pudo preparar el registro con Microsoft:", error);
        return fallar("error");
      }
    }
    if (respuestaApi.status === 403 || respuestaApi.status === 409) return fallar("restringido");
    return fallar("error");
  }

  const sesion = datosSesionDeUsuario(await respuestaApi.json().catch(() => null));
  if (!sesion) return fallar("error");

  try {
    const token = await firmarSesion(sesion);
    // La página intermedia copia el id al sessionStorage, como hace el login normal.
    const respuesta = NextResponse.redirect(new URL("/auth/microsoft", origen));
    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    respuesta.cookies.delete({ name: COOKIE_OAUTH_MICROSOFT, path: RUTA_OAUTH_MICROSOFT });
    return respuesta;
  } catch (error) {
    console.error("No se pudo crear la sesión del usuario:", error);
    return fallar("error");
  }
}
