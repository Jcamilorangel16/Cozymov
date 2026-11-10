import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerUrlApi(): string | null {
	const apiUrl = process.env.API_URL ?? process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/api/Viajes` : null;
}

async function responderError(respuesta: Response) {
	const detalle = await respuesta.text();
	let error = detalle || "No se pudo aceptar el viaje.";
	try {
		const resultado: unknown = JSON.parse(detalle);
		if (esRegistro(resultado)) {
			const mensaje = resultado.error ?? resultado.detail ?? resultado.title;
			if (typeof mensaje === "string" && mensaje) error = mensaje;
		}
	} catch {
		// El backend puede responder texto plano.
	}
	return NextResponse.json({ error }, { status: respuesta.status });
}

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

	const idViaje = esRegistro(body) ? Number(body.id_viaje) : Number.NaN;
	const idPasajero = Number(sesion.id);
	if (!Number.isSafeInteger(idViaje) || idViaje <= 0) {
		return NextResponse.json(
			{ error: "El identificador del viaje no es válido." },
			{ status: 400 },
		);
	}
	if (!Number.isSafeInteger(idPasajero) || idPasajero <= 0) {
		return NextResponse.json(
			{ error: "La sesión no contiene un identificador de usuario válido." },
			{ status: 400 },
		);
	}

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json({ error: "Falta configurar API_URL." }, { status: 500 });
	}

	try {
		const respuesta = await fetch(
			`${apiUrl}/${encodeURIComponent(String(idViaje))}/reservar`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idPasajero }),
				cache: "no-store",
			},
		);
		if (!respuesta.ok) return responderError(respuesta);

		const resultado: unknown = await respuesta.json();
		if (!esRegistro(resultado)) {
			console.error("La API devolvió una reserva con formato inválido.");
			return NextResponse.json(
				{ error: "La respuesta de la API de reservas no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json({ reserva: resultado });
	} catch (error) {
		console.error("No se pudo aceptar el viaje en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}
