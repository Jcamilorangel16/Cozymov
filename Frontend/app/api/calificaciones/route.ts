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

/**
 * Valoraciones. Por defecto, las recibidas por el usuario autenticado.
 * ?emitidas=1 devuelve las que él escribió; ?resumen=ID devuelve el promedio
 * público de cualquier usuario.
 */
export async function GET(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const { searchParams } = new URL(request.url);

	if (searchParams.has("resumen")) {
		const idEvaluado = entero(searchParams.get("resumen"));
		if (idEvaluado === null) return respuestaError("Identificador de usuario inválido.", 400);

		const respuesta = await llamarBackend(ctx, `/api/calificaciones/resumen/${idEvaluado}`);
		return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
	}

	const filtro = searchParams.has("emitidas")
		? `idEvaluador=${ctx.idUsuario}`
		: `idEvaluado=${ctx.idUsuario}`;
	const respuesta = await llamarBackend(ctx, `/api/calificaciones?${filtro}`);
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Crea una valoración; el evaluador es siempre el usuario autenticado. */
export async function POST(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const respuesta = await llamarBackend(ctx, "/api/calificaciones", "POST", {
		idReserva: cuerpo.idReserva,
		idEvaluador: ctx.idUsuario,
		idEvaluado: cuerpo.idEvaluado,
		puntuacion: cuerpo.puntuacion,
		comentario: cuerpo.comentario ?? null,
	});
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Elimina una valoración propia: DELETE /api/calificaciones?id=1 */
export async function DELETE(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const id = entero(new URL(request.url).searchParams.get("id"), Number.MAX_SAFE_INTEGER);
	if (id === null) return respuestaError("Identificador de valoración inválido.", 400);

	const ruta = `/api/calificaciones/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idEvaluador");
	if (denegado) return denegado;

	const respuesta = await llamarBackend(ctx, ruta, "DELETE");
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}
