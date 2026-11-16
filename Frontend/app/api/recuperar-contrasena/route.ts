import type { NextRequest } from "next/server";
import { getBackendApiConfig } from "../../../src/lib/backendApi.ts";

export const runtime = "nodejs";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_CODIGO = /^\d{6}$/;

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string";
}

/**
 * Proxy de recuperación de contraseña. Valida la forma de la solicitud y la
 * reenvía al backend, que genera el código, lo envía con Brevo y cambia la
 * contraseña. Aquí no hay acceso a la base de datos ni a credenciales de correo.
 * @param request Solicitud con `accion` ("solicitar" | "restablecer") y sus campos.
 * @returns Respuesta del backend o error de validación.
 */
export async function POST(request: NextRequest) {
  const config = getBackendApiConfig();
  if (!config) {
    return Response.json(
      { error: "Falta configurar VITE_API_URL o INTERNAL_API_KEY en el servidor." },
      { status: 500 },
    );
  }

  let cuerpo: Record<string, unknown>;
  try {
    const json = await request.json();
    if (!json || typeof json !== "object") throw new Error("cuerpo inválido");
    cuerpo = json as Record<string, unknown>;
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const { accion } = cuerpo;
  const correo = esTexto(cuerpo.correo) ? cuerpo.correo.trim().toLowerCase() : "";
  if (!correo || correo.length > 150 || !FORMATO_CORREO.test(correo)) {
    return Response.json({ error: "Ingresa un correo válido." }, { status: 400 });
  }

  let ruta: string;
  let datos: Record<string, string>;
  if (accion === "solicitar") {
    ruta = "/api/recuperacion/solicitar";
    datos = { correo };
  } else if (accion === "restablecer") {
    const codigo = esTexto(cuerpo.codigo) ? cuerpo.codigo.trim() : "";
    const nuevaContrasena = esTexto(cuerpo.nuevaContrasena) ? cuerpo.nuevaContrasena : "";
    if (!FORMATO_CODIGO.test(codigo)) {
      return Response.json(
        { error: "El código debe tener exactamente 6 dígitos." },
        { status: 400 },
      );
    }
    if (
      nuevaContrasena.length < 8 ||
      new TextEncoder().encode(nuevaContrasena).length > 72
    ) {
      return Response.json(
        { error: "La contraseña debe tener entre 8 y 72 bytes." },
        { status: 400 },
      );
    }
    ruta = "/api/recuperacion/restablecer";
    datos = { correo, codigo, nuevaContrasena };
  } else {
    return Response.json({ error: "Acción no válida." }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      ...config.headers,
      "Content-Type": "application/json",
    };
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
    if (ip) headers["X-Forwarded-For"] = ip;

    const respuesta = await fetch(`${config.baseUrl}${ruta}`, {
      method: "POST",
      headers,
      body: JSON.stringify(datos),
      cache: "no-store",
    });

    const detalle = await respuesta.json().catch(() => null);
    if (!respuesta.ok) {
      return Response.json(
        detalle ?? { error: `No se pudo completar la solicitud (${respuesta.status}).` },
        { status: respuesta.status },
      );
    }
    return Response.json(detalle ?? {}, { status: 200 });
  } catch (error) {
    console.error("No se pudo contactar la API de recuperación:", error);
    return Response.json({ error: "No se pudo conectar con la API." }, { status: 502 });
  }
}
