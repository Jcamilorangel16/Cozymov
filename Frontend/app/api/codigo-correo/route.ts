import { validarCorreoRegistro } from "../../../src/features/register/validations/usuarios.ts";
import { llamarCodigosCorreo } from "../../../src/lib/codigosCorreo.ts";

export const runtime = "nodejs";

/**
 * Envía un código de 6 dígitos al correo indicado.
 * Cuerpo: `{ correo, proposito: "registro" | "recuperacion" }`.
 * - registro: confirma el correo antes de crear la cuenta.
 * - recuperacion: responde igual exista o no la cuenta.
 * @param request Solicitud del navegador.
 * @returns 202 con un mensaje, o `{ error }`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const { correo, proposito } = (body ?? {}) as Record<string, unknown>;
  if (proposito !== "registro" && proposito !== "recuperacion") {
    return Response.json({ error: "Propósito no válido." }, { status: 400 });
  }

  let correoNormalizado: string;
  if (proposito === "registro") {
    const validacion = validarCorreoRegistro(correo);
    if (!validacion.valido) {
      return Response.json({ error: validacion.error }, { status: 400 });
    }
    correoNormalizado = validacion.datos;
  } else {
    if (typeof correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      return Response.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }
    correoNormalizado = correo.replace(/\s+/g, "").toLowerCase();
  }

  const { status, cuerpo } = await llamarCodigosCorreo(request, "enviar", {
    Correo: correoNormalizado,
    Proposito: proposito,
  });
  return Response.json(cuerpo, { status });
}
