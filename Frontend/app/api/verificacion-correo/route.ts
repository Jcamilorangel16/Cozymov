import { validarCorreoRegistro } from "../../../src/features/register/validations/usuarios.ts";
import { llamarCodigosCorreo, normalizarCodigo } from "../../../src/lib/codigosCorreo.ts";
import {
  cabeceraCorreoVerificado,
  firmarCorreoVerificado,
} from "../../../src/lib/verificacionCorreo.ts";

export const runtime = "nodejs";

/**
 * Confirma el código de registro que llegó al correo. Si es correcto, firma
 * la cookie httpOnly `correo_verificado` que exige POST /api/registro.
 * Cuerpo: `{ correo, codigo }`.
 * @param request Solicitud del navegador.
 * @returns 200 `{ correo }` con la cookie, o `{ error }`.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const { correo, codigo } = (body ?? {}) as Record<string, unknown>;
  const validacion = validarCorreoRegistro(correo);
  if (!validacion.valido) {
    return Response.json({ error: validacion.error }, { status: 400 });
  }
  const codigoNormalizado = normalizarCodigo(codigo);
  if (!codigoNormalizado) {
    return Response.json({ error: "El código tiene 6 dígitos." }, { status: 400 });
  }

  const { status, cuerpo } = await llamarCodigosCorreo(request, "verificar", {
    Correo: validacion.datos,
    Codigo: codigoNormalizado,
  });
  if (status !== 200) {
    return Response.json(cuerpo, { status });
  }

  try {
    const token = await firmarCorreoVerificado({ correo: validacion.datos });
    return Response.json(
      { correo: validacion.datos },
      { status: 200, headers: { "Set-Cookie": cabeceraCorreoVerificado(token) } },
    );
  } catch (error) {
    console.error("No se pudo firmar el correo verificado:", error);
    return Response.json(
      { error: "No se pudo confirmar el correo. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
