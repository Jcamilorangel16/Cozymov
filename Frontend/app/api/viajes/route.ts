// Endpoints de publicación y consulta de viajes.
import { NextResponse } from "next/server";
import {
	consultarViajes,
	publicarViaje,
} from "../../../src/features/viajes/services/viajesService";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

/**
 * Valida y publica un viaje asociado al usuario autenticado.
 * @param request Solicitud con los datos del viaje en JSON.
 * @returns Viaje creado o respuesta de error.
 */
export async function POST(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "El cuerpo de la solicitud no es un JSON válido." },
			{ status: 400 },
		);
	}

	try {
		const resultado = await publicarViaje(body, sesion.id);
		if (!resultado.valido) {
			return NextResponse.json(
				{ error: resultado.error },
				{ status: resultado.estado },
			);
		}

		return NextResponse.json({ viaje: resultado.viaje }, { status: 201 });
	} catch (error) {
		console.error("Error al registrar viaje en base de datos:", error);
		return NextResponse.json(
			{ error: "No se pudo registrar el viaje en la base de datos." },
			{ status: 500 },
		);
	}
}

/**
 * Consulta viajes activos o el viaje activo del usuario autenticado.
 * @param request Solicitud con filtros de viaje en la query.
 * @returns Resultado de la consulta o respuesta de error.
 */
export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const searchParams = new URL(request.url).searchParams;
	const idUsuario = searchParams.get("id_usuario");
	if (idUsuario !== null && idUsuario.trim() !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes consultar los viajes de otro usuario." },
			{ status: 403 },
		);
	}

	try {
		const resultado = await consultarViajes(searchParams);
		if (!resultado.valido) {
			return NextResponse.json(
				{ error: resultado.error },
				{ status: resultado.estado },
			);
		}

		return NextResponse.json(resultado.resultado);
	} catch (error) {
		console.error("Error al consultar viajes:", error);
		return NextResponse.json(
			{ error: "No se pudieron obtener los viajes." },
			{ status: 500 },
		);
	}
}
