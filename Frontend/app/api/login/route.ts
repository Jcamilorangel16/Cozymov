import { NextResponse } from "next/server";
import {
  validarCredencialesUsuario,
} from "../../../src/features/login/validations/autenticacion";
import {
  DURACION_SESION_SEGUNDOS,
  firmarSesion,
  NOMBRE_COOKIE_SESION,
} from "../../../src/lib/auth";
import { cabecerasIpCliente, getBackendApiConfig } from "../../../src/lib/backendApi";

export const runtime = "nodejs";

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerCampo(
  registro: Record<string, unknown>,
  nombreCamelCase: string,
  nombrePascalCase: string,
): unknown {
  return registro[nombreCamelCase] ?? registro[nombrePascalCase];
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
  const config = getBackendApiConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Falta configurar VITE_API_URL o INTERNAL_API_KEY." },
      { status: 500 },
    );
  }
  if (!process.env.SESSION_SECRET) {
    console.error("Falta configurar SESSION_SECRET para crear sesiones.");
    return NextResponse.json(
      { error: "El servidor no tiene configurada la sesión. Configura SESSION_SECRET y reinicia el frontend." },
      { status: 500 },
    );
  }

  let respuestaApi: Response;

  try {
    respuestaApi = await fetch(
      `${config.baseUrl}/api/Usuarios/Login`,
      {
        method: "POST",
        headers: {
          ...config.headers,
          ...cabecerasIpCliente(request),
          "Content-Type": "application/json",
        },
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
    const correoNoConfirmado = respuestaApi.status === 403;

    if (correoNoConfirmado) {
      const detalle = await respuestaApi.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            detalle.trim() ||
            "Debes confirmar tu correo electrónico antes de iniciar sesión.",
        },
        { status: 403 },
      );
    }

    // El backend bloquea temporalmente la cuenta o la IP tras muchos fallos.
    if (respuestaApi.status === 429) {
      return NextResponse.json(
        {
          error:
            "Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.",
        },
        { status: 429 },
      );
    }

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

  const idPersonas = obtenerCampo(usuarioApi, "idPersonas", "IdPersonas");
  const correo = obtenerCampo(usuarioApi, "correo", "Correo");
  const nombre = [
    obtenerCampo(usuarioApi, "primerNombre", "PrimerNombre"),
    obtenerCampo(usuarioApi, "segundoNombre", "SegundoNombre"),
    obtenerCampo(usuarioApi, "primerApellido", "PrimerApellido"),
    obtenerCampo(usuarioApi, "segundoApellido", "SegundoApellido"),
  ]
    .filter((parte): parte is string => typeof parte === "string" && parte.trim() !== "")
    .map((parte) => parte.trim())
    .join(" ");

  if (
    typeof idPersonas !== "number" ||
    !Number.isInteger(idPersonas) ||
    idPersonas <= 0 ||
    typeof correo !== "string" ||
    !correo ||
    !nombre
  ) {
    return NextResponse.json(
      { error: "La API no devolvió la identidad y el nombre del usuario." },
      { status: 502 },
    );
  }

  try {
    const token = await firmarSesion({
      id: String(idPersonas),
      correo,
      nombre,
    });

    const respuesta = NextResponse.json({
      usuario: {
        id: String(idPersonas),
        correo,
        nombre,
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