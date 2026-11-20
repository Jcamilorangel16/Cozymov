import { NextResponse, type NextRequest } from "next/server";
import { validarCorreoRegistro } from "../../../../src/features/register/validations/usuarios";
import {
  COOKIE_OAUTH_GOOGLE,
  construirUrlAutorizacion,
  crearParametrosOAuth,
  DURACION_OAUTH_SEGUNDOS,
  obtenerConfigGoogle,
  origenPublico,
} from "../../../../src/lib/google";

export const runtime = "nodejs";

/**
 * Inicia el flujo de Google: guarda state, nonce y verificador PKCE en una
 * cookie temporal httpOnly y redirige a la pantalla de autorización.
 * Con `?verificar=<correo>` el flujo solo confirma que el correo del registro
 * es del usuario: se guarda en la misma cookie y el callback lo compara.
 * @param request Solicitud del navegador.
 * @returns Redirección a Google o a la pantalla de origen con un código de error.
 */
export async function GET(request: NextRequest) {
  const config = obtenerConfigGoogle(request.nextUrl.origin);
  const origen = origenPublico(request.nextUrl.origin, config);
  const verificar = request.nextUrl.searchParams.get("verificar");
  const destinoError = verificar === null ? "/?google_error=" : "/register?verificacion_error=";
  if (!config) {
    console.error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET.");
    return NextResponse.redirect(new URL(`${destinoError}configuracion`, origen));
  }

  let correoVerificar: string | undefined;
  if (verificar !== null) {
    const correo = validarCorreoRegistro(verificar);
    if (!correo.valido) {
      return NextResponse.redirect(new URL(`${destinoError}correo_invalido`, origen));
    }
    correoVerificar = correo.datos;
  }

  const parametros = crearParametrosOAuth();
  const respuesta = NextResponse.redirect(
    construirUrlAutorizacion(config, parametros, correoVerificar),
  );
  respuesta.cookies.set(
    COOKIE_OAUTH_GOOGLE,
    JSON.stringify({
      state: parametros.state,
      nonce: parametros.nonce,
      verifier: parametros.verifier,
      ...(correoVerificar ? { verificar: correoVerificar } : {}),
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
