import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../src/lib/auth";
import {
	validarDatosNuevoViaje,
	validarFiltrosViajes,
	validarIdUsuarioViaje,
} from "../../../src/features/viajes/validations/viajes";
import { tieneReservaActiva } from "../../../src/features/viajes/repositories/reservaViajeRepository";
import { listarViajesPublicos } from "../../../src/features/viajes/repositories/viajeRepository";

export const runtime = "nodejs";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerCampo(registro: Registro, ...nombres: string[]): unknown {
	for (const nombre of nombres) {
		if (registro[nombre] !== undefined) {
			return registro[nombre];
		}
	}
	return undefined;
}

function obtenerUrlApi(): string | null {
	const apiUrl = process.env.API_URL ?? process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/api/Viajes` : null;
}

async function responderErrorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
	let error = detalle || mensaje;
	try {
		const resultado: unknown = JSON.parse(detalle);
		if (esRegistro(resultado)) {
			const detalleApi = obtenerCampo(resultado, "error", "detail", "title");
			if (typeof detalleApi === "string" && detalleApi) {
				error = detalleApi;
			}
		}
	} catch {
		// El backend puede responder texto plano.
	}
	return NextResponse.json({ error }, { status: respuesta.status });
}

function normalizarViaje(viaje: Registro, respaldo: Registro = {}): Registro {
	const fechaHora = obtenerCampo(viaje, "fechaHoraSalida", "FechaHoraSalida", "fecha_hora_salida");
	const fechaHoraTexto = typeof fechaHora === "string" ? fechaHora : "";
	const fecha = obtenerCampo(viaje, "fecha_salida", "fechaSalida") ??
		(fechaHoraTexto ? fechaHoraTexto.slice(0, 10) : undefined);
	const hora = obtenerCampo(viaje, "hora_salida", "horaSalida") ??
		(fechaHoraTexto.includes("T") ? fechaHoraTexto.slice(11, 16) : undefined);

	return {
		...viaje,
		id_viaje: obtenerCampo(viaje, "id_viaje", "idViaje", "IdViaje"),
		id_conductor: obtenerCampo(viaje, "id_conductor", "idConductor", "IdConductor"),
		id_usuario: obtenerCampo(viaje, "id_usuario", "idUsuario", "IdUsuario"),
		id_ruta: obtenerCampo(viaje, "id_ruta", "idRuta", "IdRuta"),
		origen: obtenerCampo(viaje, "origen", "Origen") ?? obtenerCampo(respaldo, "origen"),
		destino: obtenerCampo(viaje, "destino", "Destino") ?? obtenerCampo(respaldo, "destino"),
		punto_encuentro:
			obtenerCampo(viaje, "punto_encuentro", "puntoEncuentro", "PuntoEncuentro") ??
			obtenerCampo(respaldo, "punto_encuentro"),
		precio_pasaje:
			obtenerCampo(viaje, "precio_pasaje", "precioPasaje", "Costo", "costo"),
		cupos_disponibles:
			obtenerCampo(viaje, "cupos_disponibles", "cuposDisponibles", "CuposDisponibles"),
		fecha_salida: fecha,
		hora_salida: hora,
		informacion_adicional:
			obtenerCampo(viaje, "informacion_adicional", "informacionAdicional") ??
			obtenerCampo(respaldo, "informacion_adicional") ?? null,
		estado: obtenerCampo(viaje, "estado", "Estado"),
	};
}

export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const idUsuario = searchParams.get("id_usuario");
	const validacionUsuario = validarIdUsuarioViaje(idUsuario);
	if (!validacionUsuario.valido) {
		return NextResponse.json({ error: validacionUsuario.error }, { status: 400 });
	}
	if (validacionUsuario.datos !== null && validacionUsuario.datos !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes consultar los viajes de otro usuario." },
			{ status: 403 },
		);
	}

	const idViaje = searchParams.get("id_viaje");
	if (idViaje !== null && !/^[1-9]\d*$/.test(idViaje)) {
		return NextResponse.json(
			{ error: "id_viaje debe ser un identificador válido." },
			{ status: 400 },
		);
	}

	const validacionFiltros = validarFiltrosViajes(searchParams);
	if (!validacionFiltros.valido) {
		return NextResponse.json(
			{ error: validacionFiltros.error },
			{ status: 400 },
		);
	}

	try {
		const viajes = await listarViajesPublicos(validacionFiltros.datos, {
			...(validacionUsuario.datos && { idUsuario: validacionUsuario.datos }),
			...(idViaje && { idViaje }),
		});

		if (idViaje) {
			return NextResponse.json({ viaje: viajes[0] ?? null });
		}
		if (validacionUsuario.datos !== null) {
			return NextResponse.json({ viaje: viajes[0] ?? null });
		}
		return NextResponse.json({ viajes });
	} catch (error) {
		console.error("No se pudieron consultar los viajes públicos:", error);
		return NextResponse.json(
			{ error: "No se pudieron consultar los viajes. Inténtalo de nuevo." },
			{ status: 500 },
		);
	}
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
	if (!esRegistro(body)) {
		return NextResponse.json(
			{ error: "El cuerpo de la solicitud debe ser un objeto JSON." },
			{ status: 400 },
		);
	}

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar API_URL." },
			{ status: 500 },
		);
	}

	const idUsuario = Number(sesion.id);
	if (!Number.isSafeInteger(idUsuario) || idUsuario <= 0) {
		return NextResponse.json(
			{ error: "La sesión no contiene un identificador de usuario válido." },
			{ status: 400 },
		);
	}
	try {
		if (await tieneReservaActiva(idUsuario)) {
			return NextResponse.json(
				{ error: "No puedes publicar un viaje mientras tengas uno en curso." },
				{ status: 409 },
			);
		}
	} catch (error) {
		console.error("No se pudo validar si el usuario tiene un viaje en curso:", error);
		return NextResponse.json(
			{ error: "No se pudo validar tu viaje en curso. Inténtalo de nuevo." },
			{ status: 500 },
		);
	}

	const origen = obtenerCampo(body, "Origen", "origen");
	const destino = obtenerCampo(body, "Destino", "destino");
	if (typeof origen !== "string" || !origen.trim() || origen.length > 200) {
		return NextResponse.json(
			{ error: "El origen es obligatorio y no puede superar 200 caracteres." },
			{ status: 400 },
		);
	}
	if (typeof destino !== "string" || !destino.trim() || destino.length > 200) {
		return NextResponse.json(
			{ error: "El destino es obligatorio y no puede superar 200 caracteres." },
			{ status: 400 },
		);
	}

	const fechaHoraRecibida = obtenerCampo(
		body,
		"FechaHoraSalida",
		"fechaHoraSalida",
		"fecha_hora_salida",
	);
	const fechaSalida = obtenerCampo(body, "fecha_salida", "fechaSalida");
	const horaSalida = obtenerCampo(body, "hora_salida", "horaSalida");
	const fechaHoraSalida = typeof fechaHoraRecibida === "string"
		? fechaHoraRecibida
		: typeof fechaSalida === "string" && typeof horaSalida === "string"
			? `${fechaSalida}T${horaSalida.length === 5 ? `${horaSalida}:00` : horaSalida}`
			: "";
	if (!fechaHoraSalida || Number.isNaN(Date.parse(fechaHoraSalida))) {
		return NextResponse.json(
			{ error: "La fecha y hora de salida no son válidas." },
			{ status: 400 },
		);
	}

	const costo = Number(obtenerCampo(body, "Costo", "costo", "precio_pasaje", "precioPasaje"));
	const cuposDisponibles = Number(
		obtenerCampo(body, "CuposDisponibles", "cuposDisponibles", "cupos_disponibles"),
	);
	if (!Number.isFinite(costo) || costo <= 0) {
		return NextResponse.json(
			{ error: "El costo debe ser un número mayor a cero." },
			{ status: 400 },
		);
	}
	if (!Number.isInteger(cuposDisponibles) || cuposDisponibles < 1) {
		return NextResponse.json(
			{ error: "Los cupos disponibles deben ser un entero positivo." },
			{ status: 400 },
		);
	}

	const viaje = {
		IdConductor: sesion.id,
		IdUsuario: idUsuario,
		IdRuta: null,
		Origen: origen.trim(),
		Destino: destino.trim(),
		FechaHoraSalida: fechaHoraSalida,
		Costo: costo,
		CuposDisponibles: cuposDisponibles,
		Estado: obtenerCampo(body, "Estado", "estado") ?? "Activo",
	};

	try {
		const respuesta = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(viaje),
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo registrar el viaje.");
		}

		const resultado: unknown = await respuesta.json();
		if (!esRegistro(resultado)) {
			console.error("La API devolvió un viaje creado con formato inválido.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json(
			{
				viaje: normalizarViaje(resultado, body),
			},
			{ status: respuesta.status },
		);
	} catch (error) {
		console.error("No se pudo registrar el viaje en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}

export async function PUT(request: Request) {
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
	if (!esRegistro(body)) {
		return NextResponse.json(
			{ error: "El cuerpo de la solicitud debe ser un objeto JSON." },
			{ status: 400 },
		);
	}

	const idViaje = Number(obtenerCampo(body, "id_viaje", "idViaje", "IdViaje"));
	if (!Number.isSafeInteger(idViaje) || idViaje <= 0) {
		return NextResponse.json(
			{ error: "El identificador del viaje no es válido." },
			{ status: 400 },
		);
	}

	const validacion = validarDatosNuevoViaje(body, sesion.id);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar API_URL." },
			{ status: 500 },
		);
	}

	const urlViaje = `${apiUrl}/${encodeURIComponent(String(idViaje))}`;
	try {
		const respuestaActual = await fetch(urlViaje, { cache: "no-store" });
		if (!respuestaActual.ok) {
			return responderErrorApi(respuestaActual, "No se pudo consultar el viaje que quieres editar.");
		}

		const viajeActual: unknown = await respuestaActual.json();
		if (!esRegistro(viajeActual)) {
			console.error("La API devolvió un viaje con formato inválido al verificar su propietario.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}
		if (String(obtenerCampo(viajeActual, "idUsuario", "IdUsuario")) !== sesion.id) {
			return NextResponse.json(
				{ error: "No puedes editar el viaje de otro usuario." },
				{ status: 403 },
			);
		}

		const datos = validacion.datos;
		const idRutaActual = obtenerCampo(viajeActual, "idRuta", "IdRuta");
		const respuesta = await fetch(urlViaje, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				IdConductor: sesion.id,
				IdUsuario: Number(sesion.id),
				IdRuta: idRutaActual ?? null,
				Origen: datos.origen,
				Destino: datos.destino,
				FechaHoraSalida: `${datos.fecha_salida}T${datos.hora_salida.length === 5
					? `${datos.hora_salida}:00`
					: datos.hora_salida}`,
				Costo: datos.precio_pasaje,
				CuposDisponibles: datos.cupos_disponibles,
				Estado: obtenerCampo(viajeActual, "estado", "Estado") ?? "Activo",
			}),
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo actualizar el viaje.");
		}

		return NextResponse.json({
			viaje: normalizarViaje(
				{
					IdViaje: idViaje,
					IdConductor: sesion.id,
					IdUsuario: Number(sesion.id),
					IdRuta: idRutaActual ?? null,
					Origen: datos.origen,
					Destino: datos.destino,
					FechaHoraSalida: `${datos.fecha_salida}T${datos.hora_salida}`,
					Costo: datos.precio_pasaje,
					CuposDisponibles: datos.cupos_disponibles,
					Estado: obtenerCampo(viajeActual, "estado", "Estado") ?? "Activo",
				},
				body,
			),
		});
	} catch (error) {
		console.error("No se pudo actualizar el viaje en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}

export async function DELETE(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const idViaje = new URL(request.url).searchParams.get("id_viaje");
	if (!idViaje || !/^[1-9]\d*$/.test(idViaje)) {
		return NextResponse.json(
			{ error: "El identificador del viaje no es válido." },
			{ status: 400 },
		);
	}

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar API_URL." },
			{ status: 500 },
		);
	}

	const urlViaje = `${apiUrl}/${encodeURIComponent(idViaje)}`;
	try {
		const respuestaActual = await fetch(urlViaje, { cache: "no-store" });
		if (!respuestaActual.ok) {
			return responderErrorApi(respuestaActual, "No se pudo consultar el viaje.");
		}

		const viajeActual: unknown = await respuestaActual.json();
		if (!esRegistro(viajeActual)) {
			console.error("La API devolvió un viaje con formato inválido al verificar su propietario.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}
		if (String(obtenerCampo(viajeActual, "idUsuario", "IdUsuario")) !== sesion.id) {
			return NextResponse.json(
				{ error: "Solo quien publicó el viaje puede eliminarlo." },
				{ status: 403 },
			);
		}

		const respuesta = await fetch(urlViaje, {
			method: "DELETE",
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo eliminar el viaje.");
		}

		return NextResponse.json({ eliminado: true, id_viaje: Number(idViaje) });
	} catch (error) {
		console.error("No se pudo eliminar el viaje en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}