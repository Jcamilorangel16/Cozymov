import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}


function obtenerCampo(
	registro: Registro,
	...nombres: string[]
): unknown {
	for (const nombre of nombres) {
		if (registro[nombre] !== undefined) {
			return registro[nombre];
		}
	}
	return undefined;
}

function obtenerUrlApi(): string | null {
	const apiUrl = process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/Viajes` : null;
}

async function responderErrorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
	return NextResponse.json(
		{ error: detalle || mensaje },
		{ status: respuesta.status },
	);
}

function viajeActivo(viaje: unknown): boolean {
	if (!esRegistro(viaje)) {
		return false;
	}
	const estado = viaje.estado ?? viaje.Estado;
	return typeof estado === "string" && estado.toLowerCase() === "activo";
}

/**
 * Consulta todos los viajes, un viaje por su identificador o el viaje del usuario.
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

	const filtrosNoSoportados = ["origen", "destino", "fecha"].filter((filtro) =>
		searchParams.has(filtro),
	);
	if (filtrosNoSoportados.length > 0) {
		return NextResponse.json(
			{ error: "La API de viajes no permite filtrar por origen, destino o fecha." },
			{ status: 400 },
		);
	}

	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
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
		const respuesta = await fetch(
			idViaje ? `${apiUrl}/${encodeURIComponent(idViaje)}` : apiUrl,
			{ cache: "no-store" },
		);
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los viajes.");
		}

		const resultado: unknown = await respuesta.json();
		if (idViaje) {
			return NextResponse.json({ viaje: resultado });
		}
		if (!Array.isArray(resultado)) {
			console.error("La API de viajes devolvió una lista inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		if (idUsuario !== null) {
			const viaje = resultado.find((item) => {
				if (!esRegistro(item)) {
					return false;
				}
				const idConductor = item.idConductor ?? item.IdConductor;
				return String(idConductor) === sesion.id && viajeActivo(item);
			});
			return NextResponse.json({ viaje: viaje ?? null });
		}

		return NextResponse.json({ viajes: resultado.filter(viajeActivo) });
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
	if (!apiUrl) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL." },
			{ status: 500 },
		);
	}

	const viaje = {
		IdConductor: sesion.id,
		IdRuta: obtenerCampo(body, "IdRuta", "idRuta", "id_ruta"),
		FechaHoraSalida: obtenerCampo(
			body,
			"FechaHoraSalida",
			"fechaHoraSalida",
			"fecha_hora_salida",
		),
		Costo: obtenerCampo(body, "Costo", "costo"),
		CuposDisponibles: obtenerCampo(
			body,
			"CuposDisponibles",
			"cuposDisponibles",
			"cupos_disponibles",
		),
		Estado: obtenerCampo(body, "Estado", "estado"),
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
		return NextResponse.json({ viaje: resultado }, { status: respuesta.status });
	} catch (error) {
		console.error("No se pudo registrar el viaje en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}