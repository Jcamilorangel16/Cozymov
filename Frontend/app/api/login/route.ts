import { NextResponse } from "next/server";
import {
  validarCredencialesUsuario,
} from "../../../src/features/login/validations/autenticacion";
import {
  DURACION_SESION_SEGUNDOS,
  firmarSesion,
  NOMBRE_COOKIE_SESION,
} from "../../../src/lib/auth";

export const runtime = "nodejs";

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export async function POST(request: Request) {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400 },
    );
  }

  const validacion = validarCredencialesUsuario(cuerpo);
  if (!validacion.valido) {
    return NextResponse.json(
      { error: validacion.error },
      { status: validacion.estado },
    );
  }

  // Esta variable ya se usa en la ruta de registro del frontend.
  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: "Falta configurar VITE_API_URL." },
      { status: 500 },
    );
  }

  let respuestaApi: Response;

  try {
    respuestaApi = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/Usuarios/Login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Correo: validacion.datos.correo,
          Contrasena: validacion.datos.contrasena,
        }),
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("No se pudo conectar con la API de login:", error);
    return NextResponse.json(
      { error: "No se pudo conectar con el servidor." },
      { status: 502 },
    );
  }

  if (!respuestaApi.ok) {
    const esCredencialIncorrecta = respuestaApi.status === 401;

    return NextResponse.json(
      {
        error: esCredencialIncorrecta
          ? "El correo o la contraseña son incorrectos."
          : "La API de autenticación no pudo procesar la solicitud.",
      },
      { status: esCredencialIncorrecta ? 401 : 502 },
    );
  }

  let usuarioApi: unknown;

  try {
    usuarioApi = await respuestaApi.json();
  } catch (error) {
    console.error("La API de login devolvió una respuesta inválida:", error);
    return NextResponse.json(
      { error: "La respuesta de autenticación no es válida." },
      { status: 502 },
    );
  }

  if (!esRegistro(usuarioApi)) {
    return NextResponse.json(
      { error: "La respuesta de autenticación no es válida." },
      { status: 502 },
    );
  }

  const idPersonas = usuarioApi.idPersonas;
  const correo = usuarioApi.correo;

  if (
    typeof idPersonas !== "number" ||
    !Number.isInteger(idPersonas) ||
    idPersonas <= 0 ||
    typeof correo !== "string" ||
    !correo
  ) {
    return NextResponse.json(
      { error: "La API no devolvió los datos esperados del usuario." },
      { status: 502 },
    );
  }

  try {
    const token = await firmarSesion({
      id: String(idPersonas),
      correo,
    });

    const respuesta = NextResponse.json({
      usuario: {
        id: String(idPersonas),
        correo,
      },
    });

    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_SESION_SEGUNDOS,
    });

    return respuesta;
  } catch (error) {
    console.error("No se pudo crear la sesión del usuario:", error);
    return NextResponse.json(
      { error: "No se pudo crear la sesión." },
      { status: 500 },
    );
  }
}