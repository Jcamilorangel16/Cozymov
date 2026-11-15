import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	esRegistro,
	esRespuesta,
	llamarBackend,
	reenviarRespuesta,
	respuestaError,
} from "../../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

/** Reservas completadas del usuario autenticado (viajes que ya puede calificar). */
export async function GET() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const respuesta = await llamarBackend(ctx, `/api/Viajes/reservas-completadas/${ctx.idUsuario}`);
	if (respuesta instanceof NextResponse) return respuesta;
	if (!respuesta.ok) return reenviarRespuesta(respuesta);

	const datos: unknown = await respuesta.json();
	if (!Array.isArray(datos) || !datos.every(esRegistro)) {
		return respuestaError("La respuesta de la API de viajes no es válida.", 502);
	}

	return NextResponse.json({
		viajes: datos.map((reserva) => ({
			id_reserva: reserva.idReserva,
			id_viaje: reserva.idViaje,
			origen: reserva.origen,
			destino: reserva.destino,
			fecha_hora_salida: reserva.fechaHoraSalida,
			nombre_conductor: reserva.nombreConductor || "No disponible",
			id_usuario_conductor: reserva.idUsuarioConductor,
		})),
	});
}
