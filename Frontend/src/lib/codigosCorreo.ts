// Llamadas del servidor de Next.js a /api/codigos-correo del backend (códigos
// de 6 dígitos enviados por SMTP). No importa nada de next/* para poder
// probarse con node.
import { cabecerasIpCliente, getBackendApiConfig } from "./backendApi.ts";

export const ERROR_ENVIO_CORREO =
  "No pudimos enviar el correo en este momento. Inténtalo de nuevo en unos minutos.";

const ERROR_GENERICO = "No se pudo completar la solicitud. Inténtalo de nuevo.";
const FORMATO_CODIGO = /^\d{6}$/;

/**
 * Normaliza el código que escribió el usuario (quita espacios y guiones).
 * @param valor Código recibido del navegador.
 * @returns Seis dígitos o null si no tiene ese formato.
 */
export function normalizarCodigo(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.replace(/[\s-]/g, "");
  return FORMATO_CODIGO.test(limpio) ? limpio : null;
}

/**
 * Llama a un endpoint de /api/codigos-correo y devuelve una respuesta segura
 * para el navegador: los errores 5xx no reenvían el detalle del backend.
 * @param request Solicitud del navegador (para la IP del cliente).
 * @param ruta Parte final de la ruta, p. ej. "enviar".
 * @param cuerpo JSON que espera el backend.
 * @returns Estado y cuerpo JSON (`{ error }` si falló).
 */
export async function llamarCodigosCorreo(
  request: Request,
  ruta: "enviar" | "verificar" | "restablecer-contrasena",
  cuerpo: Record<string, unknown>,
): Promise<{ status: number; cuerpo: Record<string, unknown> }> {
  const config = getBackendApiConfig();
  if (!config) {
    console.error("Falta configurar VITE_API_URL o INTERNAL_API_KEY.");
    return { status: 500, cuerpo: { error: ERROR_GENERICO } };
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${config.baseUrl}/api/codigos-correo/${ruta}`, {
      method: "POST",
      headers: {
        ...config.headers,
        ...cabecerasIpCliente(request),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo conectar con la API de códigos por correo:", error);
    return { status: 502, cuerpo: { error: ERROR_GENERICO } };
  }

  const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
  if (respuesta.ok) return { status: respuesta.status, cuerpo: datos };

  if (respuesta.status >= 500) {
    // 503 con motivo smtp_sin_configurar o envio_fallido: el detalle queda en
    // el log del backend.
    if (typeof datos.motivo === "string") {
      console.error(`El envío de códigos por correo falló (${datos.motivo}). Revisa el log del backend.`);
      return { status: 503, cuerpo: { error: ERROR_ENVIO_CORREO } };
    }
    return { status: 502, cuerpo: { error: ERROR_GENERICO } };
  }

  return {
    status: respuesta.status,
    cuerpo: {
      error: typeof datos.error === "string" && datos.error ? datos.error : ERROR_GENERICO,
      ...(typeof datos.esperar === "number" ? { esperar: datos.esperar } : {}),
    },
  };
}
