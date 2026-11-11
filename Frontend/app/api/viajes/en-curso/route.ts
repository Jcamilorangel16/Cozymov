import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import {
	cancelarReservaActiva,
	ErrorReservaViaje,
	obtenerReservaActiva,
} from "../../../../src/features/viajes/repositories/reservaViajeRepository";

async function obtenerIdPasajero() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return {
			respuesta: NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 }),
		};
	}

	const idPasajero = Number(sesion.id);
	if (!Number.isSafeInteger(idPasajero) || idPasajero <= 0) {
		return {
			respuesta: NextResponse.json(
				{ error: "La sesión no contiene un identificador de usuario válido." },
				{ status: 400 },
			),
		};
	}

	return { idPasajero };
}

export async function GET() {
	const identidad = await obtenerIdPasajero();
	if ("respuesta" in identidad) return identidad.respuesta;
	const { idPasajero } = identidad;

	try {
		const resultado = await obtenerReservaActiva(idPasajero);
		if (!resultado) return NextResponse.json({ viaje: null });

		return NextResponse.json({
			viaje: {
				id_viaje: Number(resultado.id_viaje),
				origen: resultado.origen,
				destino: resultado.destino,
				fecha_salida: resultado.fecha_hora_salida.slice(0, 10),
				hora_salida: resultado.fecha_hora_salida.slice(11, 16),
				precio_pasaje: Number(resultado.costo),
				id_conductor: resultado.id_conductor,
				nombre_conductor: resultado.nombre_conductor || "No disponible",
			},
		});
	} catch (error) {
		console.error("No se pudo consultar el viaje en curso:", error);
		return NextResponse.json(
			{ error: "No se pudo consultar tu viaje en curso. Inténtalo de nuevo." },
			{ status: 500 },
		);
	}
}

export async function DELETE() {
	const identidad = await obtenerIdPasajero();
	if ("respuesta" in identidad) return identidad.respuesta;

	try {
		const resultado = await cancelarReservaActiva(identidad.idPasajero);
		return NextResponse.json({ cancelada: true, ...resultado });
	} catch (error) {
		if (error instanceof ErrorReservaViaje) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("No se pudo cancelar la reserva del viaje:", error);
		return NextResponse.json(
			{ error: "No se pudo salir del viaje. Inténtalo de nuevo." },
			{ status: 500 },
		);
	}
}
