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

function obtenerBaseApi(): string | null {
	const apiUrl = process.env.VITE_API_URL ?? process.env.API_URL;
	return apiUrl ? apiUrl.replace(/\/+$/, "") : null;
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

export async function GET() {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	if (sesion.nombre) {
		return NextResponse.json({
			nombre: sesion.nombre,
			fotoUrl: null,
			ocupacion: "",
			cedula: "",
		});
	}

	const baseApi = obtenerBaseApi();
	if (!baseApi) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL o API_URL." },
			{ status: 500 },
		);
	}

	try {
		const respuesta = await fetch(`${baseApi}/api/Usuarios/${sesion.id}`, {
			cache: "no-store",
		});

		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo consultar la información del usuario.");
		}

		const usuarioApi: unknown = await respuesta.json();
		if (!esRegistro(usuarioApi)) {
			return NextResponse.json(
				{ error: "La respuesta de la API de usuarios no es válida." },
				{ status: 502 },
			);
		}

		const nombre = [
			obtenerCampo(usuarioApi, "primerNombre", "PrimerNombre"),
			obtenerCampo(usuarioApi, "segundoNombre", "SegundoNombre"),
			obtenerCampo(usuarioApi, "primerApellido", "PrimerApellido"),
			obtenerCampo(usuarioApi, "segundoApellido", "SegundoApellido"),
		]
			.filter((parte): parte is string => typeof parte === "string" && parte.trim() !== "")
			.map((parte) => parte.trim())
			.join(" ");

		if (!nombre) {
			return NextResponse.json(
				{ error: "La API no devolvió el nombre del usuario." },
				{ status: 502 },
			);
		}

		return NextResponse.json({
			nombre,
			fotoUrl: obtenerCampo(usuarioApi, "fotoUrl", "FotoUrl") ?? null,
			ocupacion: obtenerCampo(usuarioApi, "ocupacion", "Ocupacion") ?? "",
			cedula: obtenerCampo(usuarioApi, "cedula", "Cedula") ?? "",
		});
	} catch (error) {
		console.error("No se pudo conectar con el backend para obtener el usuario:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de usuarios." },
			{ status: 502 },
		);
	}
}