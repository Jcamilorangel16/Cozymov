import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_OAUTH_GOOGLE,
  construirUrlAutorizacion,
  crearParametrosOAuth,
  DURACION_OAUTH_SEGUNDOS,
  obtenerConfigGoogle,
} from "../../../../src/lib/google";

export const runtime = "nodejs";

/**
 * Inicia el flujo de Google: guarda state, nonce y verificador PKCE en una
 * cookie temporal httpOnly y redirige a la pantalla de autorización.
 * @param request Solicitud del navegador.
 * @returns Redirección a Google o al login con un código de error.
 */
export async function GET(request: NextRequest) {
  const origen = request.nextUrl.origin;
  const config = obtenerConfigGoogle(origen);
  if (!config) {
    console.error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.");
    return NextResponse.redirect(new URL("/?google_error=configuracion", origen));
  }

  const parametros = crearParametrosOAuth();
  const respuesta = NextResponse.redirect(
    construirUrlAutorizacion(config, parametros),
  );
  respuesta.cookies.set(
    COOKIE_OAUTH_GOOGLE,
    JSON.stringify({
      state: parametros.state,
      nonce: parametros.nonce,
      verifier: parametros.verifier,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: DURACION_OAUTH_SEGUNDOS,
    },
  );
  return respuesta;
}
