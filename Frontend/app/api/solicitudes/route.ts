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

/** Deja pasar solo números finitos; el resto viaja como null. */
function numero(valor: unknown): number | null {
	const convertido = Number(valor);
	return valor !== null && valor !== "" && Number.isFinite(convertido) ? convertido : null;
}

function texto(valor: unknown): string | null {
	return typeof valor === "string" && valor.trim() ? valor.trim() : null;
}

/**
 * Carga que recibe el backend. El origen y el destino son barrios del catálogo:
 * la API resuelve (o crea) la ruta correspondiente cuando no se envía idRuta.
 */
function cargaSolicitud(idUsuario: number, cuerpo: Registro): Registro {
	return {
		idUsuario,
		idRuta: numero(cuerpo.idRuta) ?? 0,
		origen: texto(cuerpo.origen),
		destino: texto(cuerpo.destino),
		latOrigen: numero(cuerpo.latOrigen),
		lonOrigen: numero(cuerpo.lonOrigen),
		latDestino: numero(cuerpo.latDestino),
		lonDestino: numero(cuerpo.lonDestino),
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
 * Con ?pendientes=1 lista las solicitudes pendientes de otros usuarios (vista del conductor).
 * Con ?id=1 devuelve una solicitud propia; con ?id=1&coincidencias=1, sus viajes coincidentes.
 */
export async function GET(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const { searchParams } = new URL(request.url);
	if (searchParams.has("pendientes")) {
		const respuesta = await llamarBackend(
			ctx,
			`/api/solicitudes/pendientes?idUsuario=${ctx.idUsuario}`,
		);
		return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
	}

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
