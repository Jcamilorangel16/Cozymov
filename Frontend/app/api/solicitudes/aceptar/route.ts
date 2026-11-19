import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	entero,
	esRegistro,
	esRespuesta,
	leerJson,
	llamarBackend,
	reenviarRespuesta,
	respuestaError,
	type Registro,
} from "../../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

/** Reserva normalizada al formato que usa la interfaz (igual que /api/viajes/aceptar). */
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
		id_usuario_conductor: valor.idUsuarioConductor ?? valor.IdUsuarioConductor,
		nombre_conductor: valor.nombreConductor ?? valor.NombreConductor ?? "",
	};
}

/**
 * Un conductor acepta una solicitud pendiente: `POST { id_solicitud }`.
 * El conductor sale de la sesión, nunca del cuerpo de la petición. La API crea el
 * viaje privado y la reserva del pasajero; aquí no se publica ningún viaje.
 */
export async function POST(request: Request) {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const cuerpo = await leerJson(request);
	if (esRespuesta(cuerpo)) return cuerpo;

	const idSolicitud = entero(cuerpo.id_solicitud, Number.MAX_SAFE_INTEGER);
	if (idSolicitud === null) {
		return respuestaError("Identificador de solicitud inválido.", 400);
	}

	const respuesta = await llamarBackend(
		ctx,
		`/api/solicitudes/${idSolicitud}/aceptar`,
		"POST",
		{ idConductor: ctx.idUsuario },
	);
	if (respuesta instanceof NextResponse) return respuesta;
	if (!respuesta.ok) return reenviarRespuesta(respuesta);

	const resultado: unknown = await respuesta.json();
	if (!esRegistro(resultado)) {
		console.error("La API devolvió una reserva inválida al aceptar la solicitud.");
		return respuestaError("La respuesta de la API no es válida.", 502);
	}

	return NextResponse.json({ reserva: normalizarReserva(resultado) }, { status: respuesta.status });
}
