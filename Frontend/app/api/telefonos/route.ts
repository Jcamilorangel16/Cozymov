import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	entero,
	esRespuesta,
	leerJson,
	llamarBackend,
	reenviarRespuesta,
	respuestaError,
	verificarPropietario,
} from "../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

/** Lista los teléfonos del usuario autenticado. */
export async function GET() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const respuesta = await llamarBackend(ctx, `/api/telefonos?idUsuario=${ctx.idUsuario}`);
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Registra un teléfono para el usuario autenticado. */
export async function POST(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const respuesta = await llamarBackend(ctx, "/api/telefonos", "POST", {
		idUsuario: ctx.idUsuario,
		telefono: cuerpo.telefono,
	});
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Edita un teléfono propio: PUT /api/telefonos?id=1 */
export async function PUT(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const id = entero(new URL(request.url).searchParams.get("id"), Number.MAX_SAFE_INTEGER);
	if (id === null) return respuestaError("Identificador de teléfono inválido.", 400);

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const ruta = `/api/telefonos/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idUsuario");
	if (denegado) return denegado;

	const respuesta = await llamarBackend(ctx, ruta, "PUT", {
		idUsuario: ctx.idUsuario,
		telefono: cuerpo.telefono,
	});
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Elimina un teléfono propio: DELETE /api/telefonos?id=1 */
export async function DELETE(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const id = entero(new URL(request.url).searchParams.get("id"), Number.MAX_SAFE_INTEGER);
	if (id === null) return respuestaError("Identificador de teléfono inválido.", 400);

	const ruta = `/api/telefonos/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idUsuario");
	if (denegado) return denegado;

	const respuesta = await llamarBackend(ctx, ruta, "DELETE");
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}
