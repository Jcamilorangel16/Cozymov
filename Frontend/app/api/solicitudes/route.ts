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
	type Registro,
} from "../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

function cargaSolicitud(idUsuario: number, cuerpo: Registro): Registro {
	return {
		idUsuario,
		idRuta: cuerpo.idRuta,
		fechaHora: cuerpo.fechaHora,
		horaLimite: cuerpo.horaLimite ?? null,
		presupuesto: cuerpo.presupuesto ?? null,
		compartir: cuerpo.compartir === true,
	};
}

function idDeConsulta(request: Request): number | null {
	return entero(new URL(request.url).searchParams.get("id"), Number.MAX_SAFE_INTEGER);
}

/**
 * Sin parámetros lista las solicitudes del usuario autenticado.
 * Con ?id=1 devuelve una solicitud propia; con ?id=1&coincidencias=1, sus viajes coincidentes.
 */
export async function GET(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const { searchParams } = new URL(request.url);
	if (!searchParams.has("id")) {
		const respuesta = await llamarBackend(ctx, `/api/solicitudes?idUsuario=${ctx.idUsuario}`);
		return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
	}

	const id = idDeConsulta(request);
	if (id === null) return respuestaError("Identificador de solicitud inválido.", 400);

	const ruta = `/api/solicitudes/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idUsuario");
	if (denegado) return denegado;

	const destino = searchParams.has("coincidencias") ? `${ruta}/coincidencias` : ruta;
	const respuesta = await llamarBackend(ctx, destino);
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Crea una solicitud para el usuario autenticado. */
export async function POST(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const respuesta = await llamarBackend(
		ctx,
		"/api/solicitudes",
		"POST",
		cargaSolicitud(ctx.idUsuario, cuerpo),
	);
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Edita una solicitud propia: PUT /api/solicitudes?id=1 */
export async function PUT(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const id = idDeConsulta(request);
	if (id === null) return respuestaError("Identificador de solicitud inválido.", 400);

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const ruta = `/api/solicitudes/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idUsuario");
	if (denegado) return denegado;

	const respuesta = await llamarBackend(ctx, ruta, "PUT", cargaSolicitud(ctx.idUsuario, cuerpo));
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}

/** Elimina una solicitud propia: DELETE /api/solicitudes?id=1 */
export async function DELETE(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const id = idDeConsulta(request);
	if (id === null) return respuestaError("Identificador de solicitud inválido.", 400);

	const ruta = `/api/solicitudes/${id}`;
	const denegado = await verificarPropietario(ctx, ruta, "idUsuario");
	if (denegado) return denegado;

	const respuesta = await llamarBackend(ctx, ruta, "DELETE");
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}
