import { NextResponse, type NextRequest } from "next/server";
import { validarRegistroGoogle } from "../../../../src/features/register/validations/usuarios";
import {
  firmarSesion,
  NOMBRE_COOKIE_SESION,
  opcionesCookieSesion,
} from "../../../../src/lib/auth";
import {
  cabecerasIpCliente,
  getBackendApiConfig,
  mensajeErrorSeguro,
} from "../../../../src/lib/backendApi";
import { datosSesionDeUsuario } from "../../../../src/lib/google";
import {
  COOKIE_REGISTRO_GOOGLE,
  NOMBRE_PROVEEDOR,
  verificarRegistroGoogle,
  type ProveedorRegistro,
} from "../../../../src/lib/registroGoogle";

export const runtime = "nodejs";

/**
 * Extrae un mensaje legible de una respuesta de error del backend, que puede
 * ser texto plano, `{ error }` o un ProblemDetails de validación.
 * @param respuesta Respuesta no exitosa del backend.
 * @returns Mensaje o cadena vacía.
 */
async function leerMensajeError(respuesta: Response): Promise<string> {
  const detalle = await respuesta.text().catch(() => "");
  try {
    const cuerpo: unknown = JSON.parse(detalle);
    if (typeof cuerpo === "object" && cuerpo !== null) {
      const { error, errors, title } = cuerpo as Record<string, unknown>;
      if (typeof error === "string") return error;
      if (typeof errors === "object" && errors !== null) {
        const primero = Object.values(errors).flat()[0];
        if (typeof primero === "string") return primero;
      }
      if (typeof title === "string") return title;
    }
  } catch {
    // Texto plano: se usa tal cual.
  }
  return detalle;
}

/** Endpoint del backend que crea la cuenta para cada proveedor. */
const ENDPOINT_REGISTRO: Record<ProveedorRegistro, string> = {
  google: "/api/Usuarios/RegistroGoogle",
  microsoft: "/api/Usuarios/RegistroMicrosoft",
};

/**
 * Crea la cuenta con la identidad (de Google o Microsoft) guardada en la
 * cookie de registro pendiente y los datos que completó el usuario; deja la
 * sesión iniciada. El proveedor sale de la cookie firmada, nunca del cuerpo.
 * @param request Solicitud con cédula, nombres, edad, ocupación y contraseña.
 * @returns 201 con la sesión creada o un error legible.
 */
export async function POST(request: NextRequest) {
  const pendiente = await verificarRegistroGoogle(
    request.cookies.get(COOKIE_REGISTRO_GOOGLE)?.value,
  );
  if (!pendiente) {
    return NextResponse.json(
      {
        error: "El tiempo para completar el registro venció. Vuelve a intentarlo.",
        vencido: true,
      },
      { status: 401 },
    );
  }
  const nombreProveedor = NOMBRE_PROVEEDOR[pendiente.proveedor];

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const validacion = validarRegistroGoogle(body);
  if (!validacion.valido) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  const backend = getBackendApiConfig();
  if (!backend) {
    console.error("Falta configurar VITE_API_URL o INTERNAL_API_KEY.");
    return NextResponse.json(
      { error: "El registro no está disponible en este momento." },
      { status: 500 },
    );
  }

  const datos = validacion.datos;
  let respuestaApi: Response;
  try {
    respuestaApi = await fetch(`${backend.baseUrl}${ENDPOINT_REGISTRO[pendiente.proveedor]}`, {
      method: "POST",
      headers: {
        ...backend.headers,
        ...cabecerasIpCliente(request),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Identidad del proveedor: sale de la cookie firmada, nunca del cuerpo.
        // EmailVerificado solo lo lee RegistroGoogle.
        Sub: pendiente.sub,
        Correo: pendiente.correo,
        EmailVerificado: true,
        Cedula: datos.idUsuario,
        PrimerNombre: datos.primerNombre,
        SegundoNombre: datos.segundoNombre,
        PrimerApellido: datos.primerApellido,
        SegundoApellido: datos.segundoApellido,
        Edad: datos.edad,
        Ocupacion: datos.ocupacion,
        Telefono: datos.telefono,
        Contrasena: datos.contrasena,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error(`No se pudo conectar con la API de registro con ${nombreProveedor}:`, error);
    return NextResponse.json({ error: "No se pudo conectar con la API." }, { status: 502 });
  }

  if (!respuestaApi.ok) {
    const mensaje = mensajeErrorSeguro(
      respuestaApi.status,
      await leerMensajeError(respuestaApi),
      "No se pudo crear la cuenta.",
    );
    return NextResponse.json({ error: mensaje }, { status: respuestaApi.status });
  }

  const sesion = datosSesionDeUsuario(await respuestaApi.json().catch(() => null));
  if (!sesion) {
    console.error(`El backend respondió al registro con ${nombreProveedor} sin datos de usuario válidos.`);
    return NextResponse.json(
      { error: `La cuenta se creó, pero no se pudo iniciar sesión. Entra con ${nombreProveedor}.` },
      { status: 502 },
    );
  }

  try {
    const token = await firmarSesion(sesion);
    const respuesta = NextResponse.json({ mensaje: "Registro exitoso." }, { status: 201 });
    respuesta.cookies.set(NOMBRE_COOKIE_SESION, token, opcionesCookieSesion());
    respuesta.cookies.delete({ name: COOKIE_REGISTRO_GOOGLE, path: "/" });
    return respuesta;
  } catch (error) {
    console.error("No se pudo crear la sesión del usuario:", error);
    return NextResponse.json(
      { error: `La cuenta se creó, pero no se pudo iniciar sesión. Entra con ${nombreProveedor}.` },
      { status: 500 },
    );
  }
}
