// Utilidades para rutas proxy que actúan siempre en nombre del usuario de la
// sesión. El identificador de usuario nunca se toma del cliente.
import { NextResponse } from "next/server";
import { obtenerSesionActual } from "./auth";
import { getBackendApiConfig, mensajeErrorSeguro } from "./backendApi";

export type ContextoUsuario = {
	idUsuario: number;
	baseUrl: string;
	headers: Record<string, string>;
};

export type Registro = Record<string, unknown>;

export function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export function respuestaError(error: string, status: number) {
	return NextResponse.json({ error }, { status });
}

/** Convierte un texto en entero positivo de 32 bits, o null si no lo es. */
export function entero(valor: unknown, maximo = 2147483647): number | null {
	const texto = String(valor ?? "");
	if (!/^[1-9]\d{0,17}$/.test(texto)) {
		return null;
	}
	const numero = Number(texto);
	return Number.isSafeInteger(numero) && numero <= maximo ? numero : null;
}

/** Devuelve el contexto del usuario autenticado o la respuesta de error a enviar. */
export async function contextoAutenticado(): Promise<ContextoUsuario | NextResponse> {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return respuestaError("Debes iniciar sesión.", 401);
	}

	const idUsuario = entero(sesion.id);
	if (idUsuario === null) {
		return respuestaError("La sesión no es válida.", 401);
	}

	const config = getBackendApiConfig();
	if (!config) {
		return respuestaError("Falta configurar VITE_API_URL o INTERNAL_API_KEY.", 500);
	}

	return { idUsuario, baseUrl: config.baseUrl, headers: config.headers };
}

export function esRespuesta(valor: unknown): valor is NextResponse {
	return valor instanceof NextResponse;
}

export async function llamarBackend(
	ctx: ContextoUsuario,
	ruta: string,
	metodo = "GET",
	cuerpo?: Registro,
): Promise<Response | NextResponse> {
	try {
		return await fetch(`${ctx.baseUrl}${ruta}`, {
			method: metodo,
			headers: {
				...ctx.headers,
				...(cuerpo ? { "Content-Type": "application/json" } : {}),
			},
			body: cuerpo ? JSON.stringify(cuerpo) : undefined,
			cache: "no-store",
		});
	} catch (error) {
		console.error("No se pudo conectar con la API:", error);
		return respuestaError("No se pudo conectar con la API.", 502);
	}
}

/** Reenvía estado y cuerpo de la respuesta del backend al cliente. */
export async function reenviarRespuesta(respuesta: Response): Promise<NextResponse> {
	if (respuesta.status === 204) {
		return new NextResponse(null, { status: 204 });
	}

	const texto = await respuesta.text();
	let datos: unknown = null;
	try {
		datos = texto ? JSON.parse(texto) : null;
	} catch {
		datos = texto;
	}

	if (!respuesta.ok) {
		let ruta = "";
		try {
			ruta = ` en ${new URL(respuesta.url).pathname}`;
		} catch {
			// respuesta.url puede venir vacío.
		}
		let mensaje = `La solicitud no se pudo completar (HTTP ${respuesta.status}${ruta}).`;
		if (typeof datos === "string" && datos) {
			mensaje = datos;
		} else if (esRegistro(datos)) {
			const detalle = datos.error ?? datos.detail ?? datos.title;
			if (typeof detalle === "string" && detalle) {
				mensaje = detalle;
			}
		}
		return respuestaError(
			mensajeErrorSeguro(respuesta.status, mensaje, mensaje),
			respuesta.status,
		);
	}

	return NextResponse.json(datos, { status: respuesta.status });
}

/**
 * Comprueba que el recurso `ruta` pertenece al usuario de la sesión
 * (campo `campo` del JSON del backend). Devuelve null si es propio o la
 * respuesta de error (404 si no existe, 403 si es ajeno).
 */
export async function verificarPropietario(
	ctx: ContextoUsuario,
	ruta: string,
	campo: string,
): Promise<NextResponse | null> {
	const respuesta = await llamarBackend(ctx, ruta);
	if (respuesta instanceof NextResponse) {
		return respuesta;
	}
	if (respuesta.status === 404) {
		return respuestaError("No se encontró el recurso.", 404);
	}
	if (!respuesta.ok) {
		return respuestaError("No se pudo verificar el recurso.", 502);
	}

	const recurso: unknown = await respuesta.json();
	if (!esRegistro(recurso) || recurso[campo] !== ctx.idUsuario) {
		return respuestaError("No tienes permiso sobre este recurso.", 403);
	}
	return null;
}

export async function leerJson(request: Request): Promise<Registro | NextResponse> {
	try {
		const cuerpo: unknown = await request.json();
		return esRegistro(cuerpo) ? cuerpo : respuestaError("Los datos enviados no son válidos.", 400);
	} catch {
		return respuestaError("Los datos enviados no son válidos.", 400);
	}
}
