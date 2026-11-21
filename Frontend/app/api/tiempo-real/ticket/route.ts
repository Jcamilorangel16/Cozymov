import { NextResponse } from "next/server";
import { mensajeErrorSeguro } from "../../../../src/lib/backendApi";
import {
	contextoAutenticado,
	esRegistro,
	esRespuesta,
	llamarBackend,
	respuestaError,
} from "../../../../src/lib/proxyUsuario";
import { EXPLICACION_MOTIVO_SIN_HUB, evaluarUrlHub } from "../../../../src/lib/tiempoRealUrl";

export const runtime = "nodejs";

const FORMATO_TICKET = /^[0-9a-f]{64}$/;

/**
 * Causas por las que el servidor no dará ticket aunque se reintente. `motivo` es un
 * código sin datos de configuración para diagnosticar el 503 desde el navegador; el
 * detalle (qué variable revisar) va a los logs del servidor.
 */
type MotivoNoDisponible =
	| keyof typeof EXPLICACION_MOTIVO_SIN_HUB
	| "clave_interna_rechazada"
	| "usuario_inexistente"
	| "backend_sin_tiempo_real";

const EXPLICACION_BACKEND: Record<string, string> = {
	clave_interna_rechazada:
		"El backend respondió 401 al pedir el ticket: INTERNAL_API_KEY no coincide entre Next.js y la API.",
	usuario_inexistente: "El backend no encontró al usuario de la sesión (cuenta borrada).",
	backend_sin_tiempo_real:
		"El backend respondió 404 en /api/tiempo-real/tickets: la API desplegada no incluye el tiempo real (despliega una versión con SignalR).",
};

function noDisponible(motivo: MotivoNoDisponible) {
	const explicacion =
		(EXPLICACION_MOTIVO_SIN_HUB as Record<string, string>)[motivo] ?? EXPLICACION_BACKEND[motivo];
	console.warn(`Tiempo real no disponible (${motivo}): ${explicacion}`);
	// `desactivado` le indica al navegador que no reintente: seguirá con HTTP.
	return NextResponse.json(
		{ error: "Las actualizaciones en tiempo real no están disponibles.", desactivado: true, motivo },
		{ status: 503 },
	);
}

/** El 404 de «usuario no existe» lo envía el controlador; uno sin ese texto es de rutas. */
function motivo404(detalle: string): MotivoNoDisponible {
	return detalle.includes("El usuario no existe") ? "usuario_inexistente" : "backend_sin_tiempo_real";
}

/**
 * Entrega al navegador un ticket de un solo uso (60 s) para abrir la conexión de tiempo
 * real. El usuario sale de la sesión verificada, nunca del cliente; la clave interna solo
 * viaja entre este servidor y el backend. Es POST: proxy.ts rechaza los de otro origen.
 */
export async function POST() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) {
		return ctx;
	}

	const hub = evaluarUrlHub(process.env);
	if (hub.url === null) {
		return noDisponible(hub.motivo);
	}
	const url = hub.url;

	const respuesta = await llamarBackend(ctx, "/api/tiempo-real/tickets", "POST", {
		idUsuario: ctx.idUsuario,
	});
	if (esRespuesta(respuesta)) {
		return respuesta;
	}

	if (!respuesta.ok) {
		const detalle = await respuesta.text();
		// 404: la cuenta ya no existe o el backend aún no tiene la función. 401: la clave
		// interna no coincide. Reintentar no lo arregla.
		if (respuesta.status === 401) {
			return noDisponible("clave_interna_rechazada");
		}
		if (respuesta.status === 404) {
			return noDisponible(motivo404(detalle));
		}
		return respuestaError(
			mensajeErrorSeguro(respuesta.status, detalle, "No se pudo preparar la conexión en tiempo real."),
			respuesta.status,
		);
	}

	const datos: unknown = await respuesta.json().catch(() => null);
	const ticket = esRegistro(datos) ? datos.ticket : null;
	if (typeof ticket !== "string" || !FORMATO_TICKET.test(ticket)) {
		console.error("La API devolvió un ticket de tiempo real inválido.");
		return respuestaError("La respuesta de la API no es válida.", 502);
	}

	return NextResponse.json({ ticket, url }, { headers: { "Cache-Control": "no-store" } });
}
