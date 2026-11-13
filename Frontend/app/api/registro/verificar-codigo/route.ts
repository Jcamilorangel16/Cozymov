import type { NextRequest } from "next/server";
import {
  validarCodigoVerificacion,
  validarCorreoInstitucional,
} from "../../../../src/features/register/validations/usuarios";
import { getBackendApiConfig } from "../../../../src/lib/backendApi";

export const runtime = "nodejs";

/**
 * Valida el código de 6 dígitos contra el backend y devuelve el token.
 * @param request Solicitud con correo y código.
 * @returns Token de confirmación o error de validación.
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

  try {
    const respuesta = await fetch(`${config.baseUrl}/api/registro/verificar-codigo`, {
      method: "POST",
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        correo: validacionCorreo.datos,
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

    if (!detalle || typeof detalle.token !== "string") {
      return Response.json(
        { error: "La API no devolvió una confirmación válida." },
        { status: 502 },
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
