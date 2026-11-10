import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../src/lib/auth";

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
	const apiUrl = process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/api/Viajes` : null;
}

function obtenerUrlRutas(): string | null {
	const apiUrl = process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/api/rutas` : null;
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

function normalizarTexto(valor: unknown): string {
	return String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLocaleLowerCase("es")
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

async function consultarRutas(apiUrl: string): Promise<Registro[]> {
	const respuesta = await fetch(apiUrl, { cache: "no-store" });
	if (!respuesta.ok) {
		throw new Error(`La API de rutas respondió con estado ${respuesta.status}.`);
	}

	const resultado: unknown = await respuesta.json();
	if (!Array.isArray(resultado) || !resultado.every(esRegistro)) {
		throw new Error("La API de rutas devolvió una lista inválida.");
	}
	return resultado;
}

function viajeActivo(viaje: unknown): viaje is Registro {
	if (!esRegistro(viaje)) {
		return false;
	}
	const estado = obtenerCampo(viaje, "estado", "Estado");
	return typeof estado === "string" && estado.toLowerCase() === "activo";
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

/**
 * Consulta viajes de la API; el backend actualmente solo acepta búsqueda por ID.
 */
export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const idUsuario = searchParams.get("id_usuario");
	if (idUsuario !== null && idUsuario.trim() !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes consultar los viajes de otro usuario." },
			{ status: 403 },
		);
	}

	const origenFiltro = searchParams.get("origen")?.trim() ?? "";
	const destinoFiltro = searchParams.get("destino")?.trim() ?? "";
	const fechaFiltro = searchParams.get("fecha")?.trim() ?? "";
	if (origenFiltro.length > 150 || destinoFiltro.length > 150) {
		return NextResponse.json(
			{ error: "El origen y el destino no pueden superar 150 caracteres." },
			{ status: 400 },
		);
	}
	if (
		fechaFiltro &&
		(!/^\d{4}-\d{2}-\d{2}$/.test(fechaFiltro) ||
			Number.isNaN(Date.parse(`${fechaFiltro}T00:00:00.000Z`)) ||
			new Date(`${fechaFiltro}T00:00:00.000Z`).toISOString().slice(0, 10) !== fechaFiltro)
	) {
		return NextResponse.json(
			{ error: "La fecha de salida no tiene un formato válido." },
			{ status: 400 },
		);
	}

	const apiUrl = obtenerUrlApi();
	const rutasUrl = obtenerUrlRutas();
	if (!apiUrl || !rutasUrl) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL." },
			{ status: 500 },
		);
	}

	const idViaje = searchParams.get("id_viaje");
	if (idViaje !== null && !/^[1-9]\d*$/.test(idViaje)) {
		return NextResponse.json(
			{ error: "id_viaje debe ser un identificador válido." },
			{ status: 400 },
		);
	}

	try {
		const [respuesta, rutas] = await Promise.all([
			fetch(
				idViaje ? `${apiUrl}/${encodeURIComponent(idViaje)}` : apiUrl,
				{ cache: "no-store" },
			),
			consultarRutas(rutasUrl),
		]);
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los viajes.");
		}

		const resultado: unknown = await respuesta.json();
		const rutasPorId = new Map(
			rutas.map((ruta) => [
				String(obtenerCampo(ruta, "idRuta", "IdRuta", "id_ruta")),
				ruta,
			]),
		);
		const agregarRuta = (viaje: Registro): Registro => {
			const idRuta = obtenerCampo(viaje, "idRuta", "IdRuta", "id_ruta");
			const ruta = rutasPorId.get(String(idRuta));
			if (!ruta) {
				return normalizarViaje(viaje);
			}
			return normalizarViaje(
				{
					...viaje,
					origen: obtenerCampo(ruta, "origen", "Origen"),
					destino: obtenerCampo(ruta, "destino", "Destino"),
				},
				{
					origen: obtenerCampo(ruta, "origen", "Origen"),
					destino: obtenerCampo(ruta, "destino", "Destino"),
				},
			);
		};
		if (idViaje) {
			if (!esRegistro(resultado)) {
				console.error("La API devolvió un viaje con formato inválido.");
				return NextResponse.json(
					{ error: "La respuesta de la API de viajes no es válida." },
					{ status: 502 },
				);
			}
			return NextResponse.json({ viaje: agregarRuta(resultado) });
		}
		if (!Array.isArray(resultado) || !resultado.every(esRegistro)) {
			console.error("La API de viajes devolvió una lista inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		if (idUsuario !== null) {
			const viaje = resultado.find((item) => {
				const idPropietario = obtenerCampo(item, "idUsuario", "IdUsuario");
				return String(idPropietario) === sesion.id && viajeActivo(item);
			});
			return NextResponse.json({
				viaje: viaje ? agregarRuta(viaje) : null,
			});
		}

		return NextResponse.json({
			viajes: resultado
				.filter(viajeActivo)
				.map(agregarRuta)
				.filter((viaje) => {
					const origen = normalizarTexto(viaje.origen);
					const destino = normalizarTexto(viaje.destino);
					const fecha = String(viaje.fecha_salida ?? "").slice(0, 10);
					return (
						(!origenFiltro || origen.includes(normalizarTexto(origenFiltro))) &&
						(!destinoFiltro || destino.includes(normalizarTexto(destinoFiltro))) &&
						(!fechaFiltro || fecha === fechaFiltro)
					);
				}),
		});
	} catch (error) {
		console.error("No se pudo consultar la API de viajes:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}

/**
 * Registra un viaje en el backend asociándolo al usuario autenticado.
 */
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
	const rutasUrl = obtenerUrlRutas();
	if (!apiUrl || !rutasUrl) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL." },
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

	let rutaSeleccionada: Registro | undefined;
	const idRutaRecibido = obtenerCampo(body, "IdRuta", "idRuta", "id_ruta");
	if (idRutaRecibido !== undefined && idRutaRecibido !== null && idRutaRecibido !== "") {
		const idRuta = Number(idRutaRecibido);
		if (!Number.isSafeInteger(idRuta) || idRuta <= 0) {
			return NextResponse.json(
				{ error: "IdRuta debe ser un identificador válido." },
				{ status: 400 },
			);
		}
	}

	const origen = obtenerCampo(body, "Origen", "origen");
	const destino = obtenerCampo(body, "Destino", "destino");
	let rutas: Registro[];
	try {
		rutas = await consultarRutas(rutasUrl);
	} catch (error) {
		console.error("No se pudieron consultar las rutas del backend:", error);
		return NextResponse.json(
			{ error: "No se pudo consultar la lista de rutas del backend." },
			{ status: 502 },
		);
	}

	if (idRutaRecibido !== undefined && idRutaRecibido !== null && idRutaRecibido !== "") {
		rutaSeleccionada = rutas.find(
			(ruta) =>
				String(obtenerCampo(ruta, "idRuta", "IdRuta", "id_ruta")) ===
				String(idRutaRecibido),
		);
		if (!rutaSeleccionada) {
			return NextResponse.json(
				{ error: "La ruta indicada no existe." },
				{ status: 400 },
			);
		}
	} else if (typeof origen === "string" && typeof destino === "string") {
		const origenNormalizado = normalizarTexto(origen);
		const destinoNormalizado = normalizarTexto(destino);
		rutaSeleccionada = rutas.find(
			(ruta) =>
				normalizarTexto(obtenerCampo(ruta, "origen", "Origen")) === origenNormalizado &&
				normalizarTexto(obtenerCampo(ruta, "destino", "Destino")) === destinoNormalizado,
		);
	}

	const idRuta = Number(
		rutaSeleccionada
			? obtenerCampo(rutaSeleccionada, "idRuta", "IdRuta", "id_ruta")
			: NaN,
	);
	if (!rutaSeleccionada || !Number.isSafeInteger(idRuta) || idRuta <= 0) {
		return NextResponse.json(
			{
				error: "No existe una ruta precargada que coincida con el origen y destino seleccionados.",
			},
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
		IdRuta: idRuta,
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
				viaje: normalizarViaje(resultado, {
					...body,
					origen: obtenerCampo(rutaSeleccionada, "origen", "Origen"),
					destino: obtenerCampo(rutaSeleccionada, "destino", "Destino"),
				}),
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
