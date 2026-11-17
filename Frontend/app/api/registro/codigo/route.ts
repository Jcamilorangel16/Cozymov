import type { NextRequest } from "next/server";
import { validarCorreoInstitucional } from "../../../../src/features/register/validations/usuarios.ts";
import { cabecerasIpCliente, getBackendApiConfig } from "../../../../src/lib/backendApi.ts";

export const runtime = "nodejs";

/**
 * Envía al backend la solicitud para mandar el código de 6 dígitos al correo.
 * @param request Solicitud con el correo institucional.
 * @returns Respuesta del backend o error de validación.
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

  const correo = cuerpo && typeof cuerpo === "object"
    ? (cuerpo as Record<string, unknown>).correo
    : undefined;
  const validacion = validarCorreoInstitucional(correo);
  if (!validacion.valido) {
    return Response.json({ error: validacion.error }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      ...config.headers,
      ...cabecerasIpCliente(request),
      "Content-Type": "application/json",
    };

    const respuesta = await fetch(`${config.baseUrl}/api/registro/codigo`, {
      method: "POST",
      headers,
      body: JSON.stringify({ correo: validacion.datos }),
      cache: "no-store",
    });

    const detalle = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      return Response.json(
        detalle ?? { error: `No se pudo enviar el código (${respuesta.status}).` },
        { status: respuesta.status },
      );
    }

    return Response.json(detalle, { status: 200 });
  } catch (error) {
    console.error("No se pudo solicitar el código de verificación:", error);
    return Response.json(
      { error: "No se pudo conectar con la API." },
      { status: 502 },
    );
  }
}
