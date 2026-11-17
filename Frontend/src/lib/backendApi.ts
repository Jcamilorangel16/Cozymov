export function getBackendApiConfig() {
	const baseUrl = process.env.VITE_API_URL?.replace(/\/+$/, "");
	const internalApiKey = process.env.INTERNAL_API_KEY;

	if (!baseUrl || !internalApiKey) {
		return null;
	}

	return {
		baseUrl,
		headers: { "X-Internal-Api-Key": internalApiKey },
	};
}

const FORMATO_IP = /^[0-9a-fA-F:.]{3,45}$/;

/**
 * IP del navegador según el proxy de la plataforma (Vercel fija `x-real-ip` y
 * sobrescribe `x-forwarded-for`, por lo que el cliente no puede falsificarlas).
 * @param request Solicitud recibida por la ruta de Next.js.
 * @returns La IP, o null si no viene o no tiene forma de dirección IP.
 */
export function obtenerIpCliente(request: Request): string | null {
	const candidata =
		request.headers.get("x-real-ip") ??
		request.headers.get("x-forwarded-for")?.split(",")[0];
	const ip = candidata?.trim();
	return ip && FORMATO_IP.test(ip) ? ip : null;
}

/**
 * Cabeceras con las que el backend identifica al navegador para sus límites de
 * intentos. `X-Cliente-Ip` es la que usa: los balanceadores que hay entre este
 * servidor y la API reescriben `X-Forwarded-For` y le añaden su propia IP.
 * @param request Solicitud recibida por la ruta de Next.js.
 * @returns Cabeceras a añadir a la llamada al backend (vacío si no hay IP).
 */
export function cabecerasIpCliente(request: Request): Record<string, string> {
	const reenviada =
		request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for");
	const ip = obtenerIpCliente(request);
	return {
		...(reenviada ? { "X-Forwarded-For": reenviada } : {}),
		...(ip ? { "X-Cliente-Ip": ip } : {}),
	};
}

const ERROR_INTERNO = "El servicio no está disponible en este momento. Inténtalo de nuevo.";

/**
 * Mensaje de error que se le puede mostrar al navegador. Los errores 5xx del
 * backend pueden traer trazas o detalles internos (la página de excepciones de
 * desarrollo, por ejemplo), así que se sustituyen por un texto genérico y el
 * detalle se deja solo en el log del servidor.
 * @param status Estado HTTP que devolvió el backend.
 * @param detalle Mensaje extraído de la respuesta del backend.
 * @param respaldo Texto a usar cuando el backend no envía detalle.
 * @returns Mensaje seguro para el cliente.
 */
export function mensajeErrorSeguro(status: number, detalle: string, respaldo: string): string {
	if (status >= 500) {
		if (detalle) {
			console.error(`El backend respondió ${status}:`, detalle.slice(0, 2000));
		}
		return ERROR_INTERNO;
	}
	return detalle || respaldo;
}
