import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import { getBackendApiConfig, mensajeErrorSeguro } from "../../../../src/lib/backendApi";

export const runtime = "nodejs";

export async function GET() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const yo = Number(sesion.id);
	if (!Number.isInteger(yo) || yo <= 0) {
		return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
	}

	const config = getBackendApiConfig();
	if (!config) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL o INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}
	const base = config.baseUrl;

	try {
		const respuesta = await fetch(`${base}/api/Mensajes/chats?yo=${yo}`, {
			headers: config.headers,
			cache: "no-store",
		});
		if (!respuesta.ok) {
			const detalle = await respuesta.text();
			return NextResponse.json(
				{ error: mensajeErrorSeguro(respuesta.status, detalle, "No se pudieron consultar los chats.") },
				{ status: respuesta.status },
			);
		}

		const datos: unknown = await respuesta.json();
		if (!Array.isArray(datos)) {
			return NextResponse.json({ error: "Respuesta inválida de la API." }, { status: 502 });
		}

		return NextResponse.json(
			datos.map((c) => ({
				id: String(c.otro),
				nombre: c.otroNombre,
				ultimoMensaje: c.ultimoMensaje,
				noLeidos: c.noLeidos,
			})),
		);
	} catch (error) {
		console.error("No se pudo consultar los chats:", error);
		return NextResponse.json({ error: "No se pudo conectar con la API." }, { status: 502 });
	}
}