import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import {
	ErrorReservaViaje,
	reservarViaje,
} from "../../../../src/features/viajes/repositories/reservaViajeRepository";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
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

	try {
		const reserva = await reservarViaje(idViaje, idPasajero);
		return NextResponse.json({ reserva });
	} catch (error) {
		if (error instanceof ErrorReservaViaje) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("No se pudo aceptar el viaje:", error);
		return NextResponse.json(
			{ error: "No se pudo registrar la reserva. Inténtalo de nuevo." },
			{ status: 500 },
		);
	}
}
