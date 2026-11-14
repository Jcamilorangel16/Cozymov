import {
  validarRegistroUsuario,
  validarCodigoVerificacion,
  validarComprobanteVerificacion,
} from "../../../src/features/register/validations/usuarios";
import { getBackendApiConfig } from "../../../src/lib/backendApi";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const validacion = validarRegistroUsuario(body);
  if (!validacion.valido) {
    return Response.json({ error: validacion.error }, { status: 400 });
  }

  const verificacion = body && typeof body === "object"
    ? (body as Record<string, unknown>).verificacion
    : undefined;
  if (!verificacion || typeof verificacion !== "object" || Array.isArray(verificacion)) {
    return Response.json(
      { error: "Debes confirmar tu correo antes de crear la cuenta." },
      { status: 400 },
    );
  }

  const camposVerificacion = verificacion as Record<string, unknown>;
  const comprobante = validarComprobanteVerificacion(camposVerificacion.comprobante);
  const codigo = validarCodigoVerificacion(camposVerificacion.codigo);
  if (!comprobante.valido) {
    return Response.json({ error: comprobante.error }, { status: 400 });
  }
  if (!codigo.valido) {
    return Response.json({ error: codigo.error }, { status: 400 });
  }

  const config = getBackendApiConfig();
  if (!config) {
    return Response.json(
      { error: "Falta configurar VITE_API_URL o INTERNAL_API_KEY." },
      { status: 500 },
    );
  }

  const usuario = validacion.datos;

  try {
    const headers: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };
    const forwardedIp =
      request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
    if (forwardedIp) headers["X-Forwarded-For"] = forwardedIp;

    const respuesta = await fetch(`${config.baseUrl}/api/registro`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        Cedula: usuario.idUsuario,
        PrimerNombre: usuario.primerNombre,
        SegundoNombre: usuario.segundoNombre ?? "",
        PrimerApellido: usuario.primerApellido,
        SegundoApellido: usuario.segundoApellido ?? "",
        Edad: usuario.edad,
        Correo: usuario.correo,
        Contrasena: usuario.contrasena,
        rol: "usuario",
        ocupacion: usuario.ocupacion,
        Verificacion: {
          Comprobante: comprobante.datos,
          Codigo: codigo.datos,
        },
      }),
      cache: "no-store",
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      return Response.json(
        { error: detalle || `La API rechazó el registro (${respuesta.status}).` },
        { status: respuesta.status },
      );
    }

    // No reenviar al navegador la respuesta del backend, que incluye la contraseña.
    return Response.json({ mensaje: "Registro exitoso." }, { status: 201 });
  } catch (error) {
    console.error("No se pudo conectar con la API de registro:", error);
    return Response.json({ error: "No se pudo conectar con la API." }, { status: 502 });
  }
}
