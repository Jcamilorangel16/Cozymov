import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";
import { getBackendApiConfig, mensajeErrorSeguro } from "../../../../src/lib/backendApi";

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
		id_usuario_conductor: valor.idUsuarioConductor ?? valor.IdUsuarioConductor,
		nombre_conductor: valor.nombreConductor ?? valor.NombreConductor ?? "No disponible",
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
		urlConductor: `${api.baseUrl}/api/Viajes/viaje-conductor-activo/${idPasajero}`,
		headers: api.headers,
	};
}

/** Viaje privado que el usuario atiende como conductor tras aceptar una solicitud. */
function normalizarViajeConductor(valor: Registro): Registro {
	const fechaHora = valor.fechaHoraSalida ?? valor.FechaHoraSalida;
	const fechaHoraTexto = typeof fechaHora === "string" ? fechaHora : "";

	return {
		id_viaje: valor.idViaje ?? valor.IdViaje,
		origen: valor.origen ?? valor.Origen,
		destino: valor.destino ?? valor.Destino,
		fecha_salida: fechaHoraTexto.slice(0, 10),
		hora_salida: fechaHoraTexto.slice(11, 16),
		precio_pasaje: valor.costo ?? valor.Costo,
		id_pasajero: valor.idPasajero ?? valor.IdPasajero,
		nombre_pasajero: valor.nombrePasajero ?? valor.NombrePasajero ?? "No disponible",
	};
}

/** Consulta el viaje del conductor; devuelve null si no atiende ninguno. */
async function consultarViajeConductor(url: string, headers: Record<string, string>) {
	const respuesta = await fetch(url, { headers, cache: "no-store" });
	if (!respuesta.ok) return null;

	const cuerpo = await respuesta.text();
	if (!cuerpo.trim()) return null;

	const datos: unknown = JSON.parse(cuerpo);
	return esRegistro(datos) ? normalizarViajeConductor(datos) : null;
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
		const reserva: unknown = cuerpo.trim() ? JSON.parse(cuerpo) : null;

		// Sin reserva propia, el usuario puede ser el conductor de una solicitud aceptada.
		if (reserva === null) {
			const comoConductor = await consultarViajeConductor(
				resultado.urlConductor,
				resultado.headers,
			);
			return NextResponse.json(
				comoConductor
					? { viaje: comoConductor, rol: "conductor" }
					: { viaje: null, rol: null },
			);
		}

		if (!esRegistro(reserva)) {
			console.error("La API devolvió una reserva activa inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json({ viaje: normalizarViaje(reserva), rol: "pasajero" });
	} catch (error) {
		console.error("No se pudo consultar el viaje en curso en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}

/**
 * Cancela el viaje en curso del usuario autenticado.
 * Sin parámetros cancela su reserva como pasajero; con `?rol=conductor` cancela el
 * viaje que atiende como conductor. En ambos casos el usuario sale de la sesión.
 */
export async function DELETE(request: Request) {
	const resultado = await obtenerUrlReservaActiva();
	if ("respuesta" in resultado) return resultado.respuesta;

	const comoConductor = new URL(request.url).searchParams.get("rol") === "conductor";

	try {
		const respuesta = await fetch(comoConductor ? resultado.urlConductor : resultado.url, {
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

/** El pasajero finaliza su viaje en curso; la reserva queda lista para calificar. */
export async function POST() {
	const resultado = await obtenerUrlReservaActiva();
	if ("respuesta" in resultado) return resultado.respuesta;

	try {
		const respuesta = await fetch(`${resultado.url}/finalizar`, {
			method: "POST",
			headers: resultado.headers,
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return errorApi(respuesta, "No se pudo finalizar tu viaje.");
		}

		const cuerpo = await respuesta.json();
		return NextResponse.json(cuerpo, { status: respuesta.status });
	} catch (error) {
		console.error("No se pudo finalizar la reserva en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}
