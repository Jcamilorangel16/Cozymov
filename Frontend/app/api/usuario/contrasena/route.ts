import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	esRespuesta,
	leerJson,
	llamarBackend,
	reenviarRespuesta,
	respuestaError,
} from "../../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

const MAX_BYTES_CONTRASENA = 72;

/**
 * Cambia la contraseña del usuario autenticado. El id sale de la sesión,
 * nunca del cuerpo. Las contraseñas no se registran en logs.
 */
export async function POST(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const { contrasenaActual, nuevaContrasena } = cuerpo;
	if (typeof contrasenaActual !== "string" || !contrasenaActual) {
		return respuestaError("Ingresa tu contraseña actual.", 400);
	}
	if (
		typeof nuevaContrasena !== "string" ||
		nuevaContrasena.length < 8 ||
		new TextEncoder().encode(nuevaContrasena).length > MAX_BYTES_CONTRASENA
	) {
		return respuestaError("La contraseña debe tener entre 8 y 72 bytes.", 400);
	}

	const respuesta = await llamarBackend(
		ctx,
		`/api/Usuarios/${ctx.idUsuario}/contrasena`,
		"POST",
		{ contrasenaActual, nuevaContrasena },
	);
	if (respuesta instanceof NextResponse) return respuesta;

	// Una contraseña actual incorrecta no es una sesión vencida: se informa como 403.
	if (respuesta.status === 401) {
		return respuestaError("La contraseña actual es incorrecta.", 403);
	}
	return reenviarRespuesta(respuesta);
}
