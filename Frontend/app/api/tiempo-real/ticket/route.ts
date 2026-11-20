import { NextResponse } from "next/server";
import { mensajeErrorSeguro } from "../../../../src/lib/backendApi";
import {
	contextoAutenticado,
	esRegistro,
	esRespuesta,
	llamarBackend,
	respuestaError,
} from "../../../../src/lib/proxyUsuario";
import { urlHubTiempoReal } from "../../../../src/lib/tiempoRealUrl";

export const runtime = "nodejs";

const FORMATO_TICKET = /^[0-9a-f]{64}$/;

function noDisponible() {
	// `desactivado` le indica al navegador que no reintente: seguirá con HTTP.
	return NextResponse.json(
		{ error: "Las actualizaciones en tiempo real no están disponibles.", desactivado: true },
		{ status: 503 },
	);
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

	const url = urlHubTiempoReal(process.env);
	if (!url) {
		return noDisponible();
	}

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
		if (respuesta.status === 404 || respuesta.status === 401) {
			console.error(`El backend rechazó el ticket de tiempo real (HTTP ${respuesta.status}).`);
			return noDisponible();
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
