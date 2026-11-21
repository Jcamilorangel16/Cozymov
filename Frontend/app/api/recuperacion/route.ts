import { llamarCodigosCorreo, normalizarCodigo } from "../../../src/lib/codigosCorreo.ts";

export const runtime = "nodejs";

/**
 * Restablece la contraseña con el código de recuperación que llegó al correo.
 * No inicia sesión: el usuario entra después con la contraseña nueva.
 * Cuerpo: `{ correo, codigo, nuevaContrasena }`.
 * @param request Solicitud del navegador.
 * @returns 200 con un mensaje, o `{ error }`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const { correo, codigo, nuevaContrasena } = (body ?? {}) as Record<string, unknown>;
  if (typeof correo !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
    return Response.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
  }
  const codigoNormalizado = normalizarCodigo(codigo);
  if (!codigoNormalizado) {
    return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 });
  }
  if (
    typeof nuevaContrasena !== "string" ||
    nuevaContrasena.length < 8 ||
    new TextEncoder().encode(nuevaContrasena).length > 72
  ) {
    return Response.json(
      { error: "La contraseña debe tener entre 8 y 72 bytes." },
      { status: 400 },
    );
  }

  const { status, cuerpo } = await llamarCodigosCorreo(request, "restablecer-contrasena", {
    Correo: correo.replace(/\s+/g, "").toLowerCase(),
    Codigo: codigoNormalizado,
    NuevaContrasena: nuevaContrasena,
  });
  if (status === 204) {
    return Response.json({ mensaje: "Tu contraseña se cambió. Ya puedes iniciar sesión." });
  }
  return Response.json(cuerpo, { status });
}
