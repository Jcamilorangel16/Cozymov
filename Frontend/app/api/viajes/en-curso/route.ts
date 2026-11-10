import { NextResponse } from "next/server";
import { obtenerSesionActual } from "../../../../src/lib/auth";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerUrlApi(): string | null {
	const apiUrl = process.env.API_URL ?? process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/api/Viajes` : null;
}

function obtenerCampo(registro: Registro, ...nombres: string[]): unknown {
	for (const nombre of nombres) {
		if (registro[nombre] !== undefined) return registro[nombre];
	}
	return undefined;
}

export async function GET() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const idPasajero = Number(sesion.id);
	if (!Number.isSafeInteger(idPasajero) || idPasajero <= 0) {
		return NextResponse.json(
			{ error: "La sesión no contiene un identificador de usuario válido." },
			{ status: 400 },
		);
	}
	const apiUrl = obtenerUrlApi();
	if (!apiUrl) {
		return NextResponse.json({ error: "Falta configurar API_URL." }, { status: 500 });
	}

	try {
		const respuesta = await fetch(
			`${apiUrl}/reserva-activa/${encodeURIComponent(String(idPasajero))}`,
			{ cache: "no-store" },
		);
		if (!respuesta.ok) {
			const detalle = await respuesta.text();
			let error = detalle || "No se pudo consultar tu viaje en curso.";
			try {
				const resultado: unknown = JSON.parse(detalle);
				if (esRegistro(resultado)) {
					const mensaje = obtenerCampo(resultado, "error", "detail", "title");
					if (typeof mensaje === "string" && mensaje) error = mensaje;
				}
			} catch {
				// El backend puede responder texto plano.
			}
			return NextResponse.json(
				{ error },
				{ status: respuesta.status },
			);
		}

		const textoRespuesta = await respuesta.text();
		if (!textoRespuesta) return NextResponse.json({ viaje: null });
		let resultado: unknown;
		try {
			resultado = JSON.parse(textoRespuesta);
		} catch (error) {
			console.error("La API devolvió una reserva que no es JSON válido:", error);
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}
		if (resultado === null) return NextResponse.json({ viaje: null });
		if (!esRegistro(resultado)) {
			console.error("La API devolvió la reserva activa con formato inválido.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}

		const fechaHora = obtenerCampo(
			resultado,
			"fechaHoraSalida",
			"FechaHoraSalida",
			"fecha_hora_salida",
		);
		const fechaHoraTexto = typeof fechaHora === "string" ? fechaHora : "";
		const conductor = obtenerCampo(resultado, "nombreConductor", "NombreConductor");
		const idViaje = obtenerCampo(resultado, "idViaje", "IdViaje");
		const origen = obtenerCampo(resultado, "origen", "Origen");
		const destino = obtenerCampo(resultado, "destino", "Destino");
		if (
			!idViaje ||
			typeof origen !== "string" ||
			typeof destino !== "string" ||
			!fechaHoraTexto
		) {
			console.error("La API devolvió datos incompletos para la reserva activa.");
			return NextResponse.json(
				{ error: "La respuesta de la API de viajes no es válida." },
				{ status: 502 },
			);
		}
		return NextResponse.json({
			viaje: {
				id_viaje: idViaje,
				origen,
				destino,
				fecha_salida: fechaHoraTexto.slice(0, 10),
				hora_salida: fechaHoraTexto.includes("T")
					? fechaHoraTexto.slice(11, 16)
					: "",
				precio_pasaje: obtenerCampo(resultado, "costo", "Costo"),
				id_conductor: obtenerCampo(resultado, "idConductor", "IdConductor"),
				nombre_conductor:
					typeof conductor === "string" && conductor.trim()
						? conductor
						: "No disponible",
			},
		});
	} catch (error) {
		console.error("No se pudo consultar el viaje en curso:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de viajes." },
			{ status: 502 },
		);
	}
}
