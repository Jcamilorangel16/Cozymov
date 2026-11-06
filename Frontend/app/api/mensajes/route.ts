import { NextResponse } from "next/server";
import {
	validarDatosMensaje,
	validarParticipantesMensaje,
} from "../../../src/features/mensajes/validations/mensajes";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerCampo(registro: Registro, camelCase: string, pascalCase: string) {
	return registro[camelCase] ?? registro[pascalCase];
}

function obtenerIdNumerico(valor: string): number | null {
	if (!/^[1-9]\d*$/.test(valor)) {
		return null;
	}
	const id = Number(valor);
	return Number.isInteger(id) && id <= 2147483647 ? id : null;
}

function mapearMensaje(valor: unknown): Registro | null {
	if (!esRegistro(valor)) {
		return null;
	}

	const idMensaje = obtenerCampo(valor, "idMensaje", "IdMensaje");
	const idEmisor = obtenerCampo(valor, "idEmisor", "IdEmisor");
	const idReceptor = obtenerCampo(valor, "idReceptor", "IdReceptor");
	const contenido = obtenerCampo(valor, "contenido", "Contenido");
	const fechaHora = obtenerCampo(valor, "fechaHora", "FechaHora");
	const leido = obtenerCampo(valor, "leido", "Leido");

	if (
		typeof idMensaje !== "number" ||
		typeof idEmisor !== "number" ||
		typeof idReceptor !== "number" ||
		typeof contenido !== "string" ||
		typeof fechaHora !== "string" ||
		typeof leido !== "boolean"
	) {
		return null;
	}

	return {
		id_mensaje: idMensaje,
		id_emisor: idEmisor,
		id_receptor: idReceptor,
		contenido,
		fecha_hora: fechaHora,
		leido,
	};
}

function obtenerUrlApi(): string | null {
	const apiUrl = process.env.VITE_API_URL;
	return apiUrl ? `${apiUrl.replace(/\/+$/, "")}/Mensajes` : null;
}

async function responderErrorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
	return NextResponse.json(
		{ error: detalle || mensaje },
		{ status: respuesta.status },
	);
}

/**
 * Obtiene y marca como leídos los mensajes de la conversación con el usuario.
 */
export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const { searchParams } = new URL(request.url);
	const validacion = validarParticipantesMensaje(
		searchParams.get("usuario1"),
		searchParams.get("usuario2"),
	);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}
	if (validacion.datos.usuario1 !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes consultar conversaciones de otro usuario." },
			{ status: 403 },
		);
	}

	const yo = obtenerIdNumerico(sesion.id);
	const otro = obtenerIdNumerico(validacion.datos.usuario2);
	if (yo === null || otro === null) {
		return NextResponse.json(
			{ error: "Los identificadores deben ser enteros válidos." },
			{ status: 400 },
		);
	}
	if (yo === otro) {
		return NextResponse.json(
			{ error: "No puedes abrir una conversación contigo mismo." },
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

	try {
		const respuesta = await fetch(
			`${apiUrl}/conversacion?yo=${yo}&otro=${otro}`,
			{ cache: "no-store" },
		);
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los mensajes.");
		}

		const resultado: unknown = await respuesta.json();
		if (!Array.isArray(resultado)) {
			console.error("La API de mensajes devolvió una respuesta inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de mensajes no es válida." },
				{ status: 502 },
			);
		}

		const mensajes = resultado.map(mapearMensaje);
		if (mensajes.some((mensaje) => mensaje === null)) {
			console.error("La API de mensajes devolvió datos de mensaje inválidos.");
			return NextResponse.json(
				{ error: "La respuesta de la API de mensajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json(mensajes);
	} catch (error) {
		console.error("No se pudo consultar la API de mensajes:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de mensajes." },
			{ status: 502 },
		);
	}
}

/**
 * Envía un mensaje desde el usuario autenticado al destinatario indicado.
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
			{ error: "Los datos del mensaje no son válidos." },
			{ status: 400 },
		);
	}

	const validacion = validarDatosMensaje(body);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}
	if (validacion.datos.id_emisor !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes enviar mensajes en nombre de otro usuario." },
			{ status: 403 },
		);
	}

	const idEmisor = obtenerIdNumerico(sesion.id);
	const idReceptor = obtenerIdNumerico(validacion.datos.id_receptor);
	if (idEmisor === null || idReceptor === null) {
		return NextResponse.json(
			{ error: "Los identificadores deben ser enteros válidos." },
			{ status: 400 },
		);
	}
	if (idEmisor === idReceptor) {
		return NextResponse.json(
			{ error: "No puedes enviarte un mensaje a ti mismo." },
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

	try {
		const respuesta = await fetch(apiUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				IdEmisor: idEmisor,
				IdReceptor: idReceptor,
				Contenido: validacion.datos.contenido,
			}),
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo enviar el mensaje.");
		}

		const resultado: unknown = await respuesta.json();
		const mensaje = mapearMensaje(resultado);
		if (!mensaje) {
			console.error("La API de mensajes devolvió un mensaje inválido.");
			return NextResponse.json(
				{ error: "La respuesta de la API de mensajes no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json(mensaje, { status: respuesta.status });
	} catch (error) {
		console.error("No se pudo enviar el mensaje a la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de mensajes." },
			{ status: 502 },
		);
	}
}