import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../src/lib/auth";
import {
	validarDatosNuevoViaje,
	validarFiltrosViajes,
	validarIdUsuarioViaje,
} from "../../../src/features/viajes/validations/viajes";
import { getBackendApiConfig, mensajeErrorSeguro } from "../../../src/lib/backendApi";

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

function obtenerUrlApi() {
	const api = getBackendApiConfig();
	return api ? { ...api, url: `${api.baseUrl}/api/Viajes` } : null;
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
	return NextResponse.json(
		{ error: mensajeErrorSeguro(respuesta.status, error, mensaje) },
		{ status: respuesta.status },
	);
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
		primer_nombre: obtenerCampo(viaje, "primerNombre", "PrimerNombre", "primer_nombre"),
		primer_apellido: obtenerCampo(viaje, "primerApellido", "PrimerApellido", "primer_apellido"),
		nombre_conductor:
			obtenerCampo(viaje, "nombreConductor", "NombreConductor", "nombre_conductor"),
		ocupacion_conductor:
			obtenerCampo(viaje, "ocupacionConductor", "OcupacionConductor", "ocupacion_conductor"),
		tipo_vehiculo:
			obtenerCampo(viaje, "tipoVehiculo", "TipoVehiculo", "tipo_vehiculo"),
		modelo_vehiculo:
			obtenerCampo(viaje, "modeloVehiculo", "ModeloVehiculo", "modelo_vehiculo"),
		capacidad_vehiculo:
			obtenerCampo(viaje, "capacidadVehiculo", "CapacidadVehiculo", "capacidad_vehiculo"),
		foto_vehiculo:
			obtenerCampo(viaje, "fotoVehiculo", "FotoVehiculo", "foto_vehiculo"),
		numero_puertas:
			obtenerCampo(viaje, "numeroPuertas", "NumeroPuertas", "numero_puertas"),
		modalidad_moto:
			obtenerCampo(viaje, "modalidadMoto", "ModalidadMoto", "modalidad_moto"),
		informacion_adicional:
			obtenerCampo(viaje, "informacion_adicional", "informacionAdicional", "InformacionAdicional") ??
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

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}

	const parametrosApi = new URLSearchParams();
	if (validacionFiltros.datos.origen) {
		parametrosApi.set("origen", validacionFiltros.datos.origen);
	}
	if (validacionFiltros.datos.destino) {
		parametrosApi.set("destino", validacionFiltros.datos.destino);
	}
	if (validacionFiltros.datos.fecha) {
		parametrosApi.set("fecha", validacionFiltros.datos.fecha);
	}
	if (validacionUsuario.datos) {
		parametrosApi.set("id_usuario", validacionUsuario.datos);
	}
	if (idViaje) {
		parametrosApi.set("id_viaje", idViaje);
	}

	try {
		const query = parametrosApi.toString();
		const respuesta = await fetch(
			`${apiUrl.url}${query ? `?${query}` : ""}`,
			{ headers: apiUrl.headers, cache: "no-store" },
		);
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los viajes.");
		}

		const resultado: unknown = await respuesta.json();
		if (!Array.isArray(resultado) || !resultado.every(esRegistro)) {
			console.error("La API de viajes devolvió una lista inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}
		const viajes = resultado.map((viaje) => normalizarViaje(viaje));

		if (idViaje) {
			return NextResponse.json({ viaje: viajes[0] ?? null });
		}
		if (validacionUsuario.datos !== null) {
			return NextResponse.json({ viaje: viajes[0] ?? null });
		}
		return NextResponse.json({ viajes });
	} catch (error) {
		console.error("No se pudieron consultar los viajes en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
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

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}

	const validacion = validarDatosNuevoViaje(body, sesion.id);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}

	const datos = validacion.datos;
	const viaje = {
		IdUsuario: Number(sesion.id),
		IdRuta: null,
		Origen: datos.origen,
		Destino: datos.destino,
		PuntoEncuentro: datos.punto_encuentro,
		InformacionAdicional: datos.informacion_adicional,
		FechaHoraSalida: `${datos.fecha_salida}T${datos.hora_salida.length === 5
			? `${datos.hora_salida}:00`
			: datos.hora_salida}`,
		Costo: datos.precio_pasaje,
		CuposDisponibles: datos.cupos_disponibles,
		Estado: "Activo",
	};

	try {
		const respuesta = await fetch(apiUrl.url, {
			method: "POST",
			headers: {
				...apiUrl.headers,
				"Content-Type": "application/json",
			},
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
				viaje: normalizarViaje(resultado, viaje),
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
			{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}

	const urlViaje = `${apiUrl.url}/${encodeURIComponent(String(idViaje))}`;
	try {
		const respuestaActual = await fetch(urlViaje, {
			headers: apiUrl.headers,
			cache: "no-store",
		});
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
			headers: {
				...apiUrl.headers,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				IdUsuario: Number(sesion.id),
				IdRuta: idRutaActual ?? null,
				Origen: datos.origen,
				Destino: datos.destino,
				PuntoEncuentro: datos.punto_encuentro,
				InformacionAdicional: datos.informacion_adicional,
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
			{ error: "Falta configurar VITE_API_URL e INTERNAL_API_KEY." },
			{ status: 500 },
		);
	}

	const urlViaje = `${apiUrl.url}/${encodeURIComponent(idViaje)}`;
	try {
		const respuestaActual = await fetch(urlViaje, {
			headers: apiUrl.headers,
			cache: "no-store",
		});
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
			headers: apiUrl.headers,
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