import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import { getBackendApiConfig } from "../../../../src/lib/backendApi";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function normalizarViaje(valor: Registro): Registro {
	const fechaHora = valor.fechaHoraSalida ?? valor.FechaHoraSalida;
	const fechaHoraTexto = typeof fechaHora === "string" ? fechaHora : "";

	return {
		id_viaje: valor.idViaje ?? valor.IdViaje,
		origen: valor.origen ?? valor.Origen,
		destino: valor.destino ?? valor.Destino,
		fecha_salida: fechaHoraTexto.slice(0, 10),
		hora_salida: fechaHoraTexto.slice(11, 16),
		precio_pasaje: valor.costo ?? valor.Costo,
		id_conductor: valor.idConductor ?? valor.IdConductor,
		nombre_conductor: valor.nombreConductor ?? valor.NombreConductor ?? "No disponible",
	};
}

async function errorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
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

async function obtenerUrlReservaActiva() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return {
			respuesta: NextResponse.json(
				{ error: "Debes iniciar sesión." },
				{ status: 401 },
			),
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

	const api = getBackendApiConfig();
	if (!api) {
		return {
			respuesta: NextResponse.json(
				{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
				{ status: 500 },
			),
		};
	}

	return {
		url: `${api.baseUrl}/api/Viajes/reserva-activa/${idPasajero}`,
		headers: api.headers,
	};
}

export async function GET() {
	const resultado = await obtenerUrlReservaActiva();
	if ("respuesta" in resultado) return resultado.respuesta;

	try {
		const respuesta = await fetch(resultado.url, {
			headers: resultado.headers,
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return errorApi(respuesta, "No se pudo consultar tu viaje en curso.");
		}

		const cuerpo = await respuesta.text();
		if (!cuerpo.trim()) {
			return NextResponse.json({ viaje: null });
		}

		const reserva: unknown = JSON.parse(cuerpo);
		if (reserva === null) {
			return NextResponse.json({ viaje: null });
		}
		if (!esRegistro(reserva)) {
			console.error("La API devolvió una reserva activa inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json({ viaje: normalizarViaje(reserva) });
	} catch (error) {
		console.error("No se pudo consultar el viaje en curso en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}

export async function DELETE() {
	const resultado = await obtenerUrlReservaActiva();
	if ("respuesta" in resultado) return resultado.respuesta;

	try {
		const respuesta = await fetch(resultado.url, {
			method: "DELETE",
			headers: resultado.headers,
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return errorApi(respuesta, "No se pudo cancelar tu viaje en curso.");
		}

		const cuerpo = await respuesta.json();
		return NextResponse.json(cuerpo, { status: respuesta.status });
	} catch (error) {
		console.error("No se pudo cancelar la reserva en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}
