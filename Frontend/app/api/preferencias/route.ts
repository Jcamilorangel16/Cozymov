import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	esRespuesta,
	leerJson,
	llamarBackend,
	reenviarRespuesta,
} from "../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

/** Preferencias del usuario autenticado (404 si no tiene). */
export async function GET() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const respuesta = await llamarBackend(ctx, `/api/preferencias/${ctx.idUsuario}`);
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Crea o reemplaza las preferencias del usuario autenticado. */
export async function PUT(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const respuesta = await llamarBackend(ctx, `/api/preferencias/${ctx.idUsuario}`, "PUT", {
		prioridadCosto: cuerpo.prioridadCosto ?? null,
		prioridadTiempo: cuerpo.prioridadTiempo ?? null,
		preferirCompartir: cuerpo.preferirCompartir ?? null,
	});
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Elimina las preferencias del usuario autenticado. */
export async function DELETE() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const respuesta = await llamarBackend(ctx, `/api/preferencias/${ctx.idUsuario}`, "DELETE");
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}
