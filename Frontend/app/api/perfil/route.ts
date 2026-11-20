import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	entero,
	esRespuesta,
	llamarBackend,
	reenviarRespuesta,
	respuestaError,
} from "../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

/**
 * Perfil público (solo lectura): GET ?id=N devuelve el de cualquier usuario
 * (sin id, el propio). El backend ya omite cédula, correo, teléfonos, edad y
 * autores de reseñas.
 */
export async function GET(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const parametro = new URL(request.url).searchParams.get("id");
	const idUsuario = parametro === null ? ctx.idUsuario : entero(parametro);
	if (idUsuario === null) return respuestaError("Identificador de usuario inválido.", 400);

	const respuesta = await llamarBackend(ctx, `/api/perfiles/${idUsuario}`);
	if (respuesta instanceof NextResponse) return respuesta;
	if (respuesta.status === 404) return respuestaError("No se encontró el perfil.", 404);
	return reenviarRespuesta(respuesta);
}
