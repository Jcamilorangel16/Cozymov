import { NextResponse, type NextRequest } from "next/server";
import {
  crearParametrosOAuth,
  DURACION_OAUTH_SEGUNDOS,
  origenPublico,
} from "../../../../src/lib/google";
import {
  COOKIE_OAUTH_MICROSOFT,
  construirUrlAutorizacionMicrosoft,
  obtenerConfigMicrosoft,
  RUTA_OAUTH_MICROSOFT,
} from "../../../../src/lib/microsoft";

export const runtime = "nodejs";

/**
 * Inicia el flujo de Microsoft: guarda state, nonce y verificador PKCE en una
 * cookie temporal httpOnly y redirige a la pantalla de inicio de sesión de
 * Microsoft del tenant de la universidad.
 * @param request Solicitud del navegador.
 * @returns Redirección a Microsoft o al login con un código de error.
 */
export async function GET(request: NextRequest) {
  const config = obtenerConfigMicrosoft(request.nextUrl.origin);
  const origen = origenPublico(request.nextUrl.origin, config);
  if (!config) {
    console.error(
      "Faltan MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET o MICROSOFT_TENANT_ID (GUID).",
    );
    return NextResponse.redirect(new URL("/?microsoft_error=configuracion", origen));
  }

  const parametros = crearParametrosOAuth();
  const respuesta = NextResponse.redirect(construirUrlAutorizacionMicrosoft(config, parametros));
  respuesta.cookies.set(
    COOKIE_OAUTH_MICROSOFT,
    JSON.stringify({
      state: parametros.state,
      nonce: parametros.nonce,
      verifier: parametros.verifier,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: RUTA_OAUTH_MICROSOFT,
      maxAge: DURACION_OAUTH_SEGUNDOS,
    },
  );
  return respuesta;
}
