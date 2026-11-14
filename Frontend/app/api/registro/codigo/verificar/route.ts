import type { NextRequest } from "next/server";
import {
  validarCodigoVerificacion,
  validarComprobanteVerificacion,
  validarCorreoInstitucional,
} from "../../../../../src/features/register/validations/usuarios";
import { getBackendApiConfig } from "../../../../../src/lib/backendApi";

export const runtime = "nodejs";

/**
 * Valida el código de 6 dígitos y su comprobante contra el backend.
 * @param request Solicitud con correo, comprobante y código.
 * @returns Resultado de verificación.
 */
export async function POST(request: NextRequest) {
  const config = getBackendApiConfig();
  if (!config) {
    return Response.json(
      {
        error:
          "Falta configurar VITE_API_URL o INTERNAL_API_KEY en el servidor.",
      },
      { status: 500 },
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo no es un JSON válido." },
      { status: 400 },
    );
  }

  const registro = cuerpo && typeof cuerpo === "object"
    ? (cuerpo as Record<string, unknown>)
    : {};
  const validacionCorreo = validarCorreoInstitucional(registro.correo);
  if (!validacionCorreo.valido) {
    return Response.json({ error: validacionCorreo.error }, { status: 400 });
  }

  const validacionCodigo = validarCodigoVerificacion(registro.codigo);
  if (!validacionCodigo.valido) {
    return Response.json({ error: validacionCodigo.error }, { status: 400 });
  }

  const validacionComprobante = validarComprobanteVerificacion(registro.comprobante);
  if (!validacionComprobante.valido) {
    return Response.json(
      { error: validacionComprobante.error },
      { status: 400 },
    );
  }

  try {
    const headers: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };
    const forwardedIp =
      request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
    if (forwardedIp) headers["X-Forwarded-For"] = forwardedIp;

    const respuesta = await fetch(`${config.baseUrl}/api/registro/codigo/verificar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        correo: validacionCorreo.datos,
        comprobante: validacionComprobante.datos,
        codigo: validacionCodigo.datos,
      }),
      cache: "no-store",
    });

    const detalle = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      return Response.json(
        detalle ?? { error: `No se pudo verificar el código (${respuesta.status}).` },
        { status: respuesta.status },
      );
    }

    return Response.json(detalle, { status: 200 });
  } catch (error) {
    console.error("No se pudo verificar el código:", error);
    return Response.json(
      { error: "No se pudo conectar con la API." },
      { status: 502 },
    );
  }
}
