import { NextResponse } from "next/server";
import {
	firmarSesion,
	NOMBRE_COOKIE_SESION,
	obtenerSesionActual,
	opcionesCookieSesion,
} from "../../../src/lib/auth";

export const runtime = "nodejs";

/**
 * Renueva la sesión del dispositivo: emite una cookie nueva con la duración completa.
 * El menú la llama al cargar, de modo que la sesión no caduca mientras se use la aplicación.
 * Solo renueva una sesión que ya es válida; nunca crea una.
 */
export async function POST() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const respuesta = NextResponse.json({ ok: true });
	respuesta.cookies.set(NOMBRE_COOKIE_SESION, await firmarSesion(sesion), opcionesCookieSesion());
	return respuesta;
}
