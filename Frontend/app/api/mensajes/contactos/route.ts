import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const yo = Number(sesion.id);
	if (!Number.isInteger(yo) || yo <= 0) {
		return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
	}

	const base = process.env.VITE_API_URL?.replace(/\/+$/, "");
	if (!base) {
		return NextResponse.json({ error: "Falta configurar VITE_API_URL." }, { status: 500 });
	}

	const q = new URL(request.url).searchParams.get("q") ?? "";

	try {
		const respuesta = await fetch(
			`${base}/Usuarios/contactos?yo=${yo}&q=${encodeURIComponent(q)}`,
			{ cache: "no-store" },
		);
		if (!respuesta.ok) {
			const detalle = await respuesta.text();
			return NextResponse.json(
				{ error: detalle || "No se pudieron consultar los usuarios." },
				{ status: respuesta.status },
			);
		}

		const datos: unknown = await respuesta.json();
		if (!Array.isArray(datos)) {
			return NextResponse.json({ error: "Respuesta inválida de la API." }, { status: 502 });
		}

		return NextResponse.json(
			datos.map((c) => ({
				id: String(c.idPersonas),
				nombre: c.nombre,
				rol: c.ocupacion,
			})),
		);
	} catch (error) {
		console.error("No se pudo consultar los usuarios:", error);
		return NextResponse.json({ error: "No se pudo conectar con la API." }, { status: 502 });
	}
}