import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import { getBackendApiConfig, mensajeErrorSeguro } from "../../../../src/lib/backendApi";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function normalizarReserva(valor: Registro): Registro {
	const fechaHora = valor.fechaHoraSalida ?? valor.FechaHoraSalida;
	const fechaHoraTexto = typeof fechaHora === "string" ? fechaHora : "";

	return {
		id_reserva: valor.idReserva ?? valor.IdReserva,
		id_viaje: valor.idViaje ?? valor.IdViaje,
		id_pasajero: valor.idPasajero ?? valor.IdPasajero,
		origen: valor.origen ?? valor.Origen,
		destino: valor.destino ?? valor.Destino,
		fecha_hora_salida: fechaHoraTexto,
		costo: valor.costo ?? valor.Costo,
		id_conductor: valor.idConductor ?? valor.IdConductor,
		nombre_conductor: valor.nombreConductor ?? valor.NombreConductor ?? "",
	};
}

async function errorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
	if (respuesta.status >= 500) {
		return NextResponse.json(
			{ error: mensajeErrorSeguro(respuesta.status, detalle, mensaje) },
			{ status: respuesta.status },
		);
	}
	if (!detalle) {
		return NextResponse.json({ error: mensaje }, { status: respuesta.status });
	}

	try {
		const resultado: unknown = JSON.parse(detalle);
		if (typeof resultado === "string") {
			return NextResponse.json({ error: resultado }, { status: respuesta.status });
		}
		if (esRegistro(resultado)) {
			const error = resultado.error ?? resultado.detail ?? resultado.title;
			if (typeof error === "string") {
				return NextResponse.json({ error }, { status: respuesta.status });
			}
		}
	} catch {
		return NextResponse.json({ error: detalle }, { status: respuesta.status });
	}

	return NextResponse.json({ error: detalle }, { status: respuesta.status });
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

	const api = getBackendApiConfig();
	if (!api) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}

	try {
		const respuesta = await fetch(
			`${api.baseUrl}/api/Viajes/${idViaje}/reservar`,
			{
				method: "POST",
				headers: {
					...api.headers,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ idPasajero }),
				cache: "no-store",
			},
		);
		if (!respuesta.ok) {
			return errorApi(respuesta, "No se pudo registrar la reserva.");
		}

		const resultado: unknown = await respuesta.json();
		if (!esRegistro(resultado)) {
			console.error("La API de viajes devolvió una reserva inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json(
			{ reserva: normalizarReserva(resultado) },
			{ status: respuesta.status },
		);
	} catch (error) {
		console.error("No se pudo conectar con la API para aceptar el viaje:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}
