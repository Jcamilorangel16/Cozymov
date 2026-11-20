// Dirección pública del Hub de tiempo real. La usan la ruta de tickets (para decírsela al
// navegador) y next.config.ts (para permitirla en la CSP). No contiene secretos.

/** Ruta del Hub en el backend (TiempoRealHub.Ruta). */
export const RUTA_HUB_TIEMPO_REAL = "/hubs/tiempo-real";

type Entorno = Record<string, string | undefined>;

const ANFITRIONES_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Por qué no hay Hub disponible. Son códigos sin datos de configuración: se pueden
 * mostrar al navegador y escribir en los logs sin revelar URLs ni claves.
 */
export type MotivoSinHub =
  | "desactivado"
  | "sin_configurar"
  | "url_invalida"
  | "requiere_https"
  | "url_con_credenciales";

/** Explicación para los logs del servidor (nombra variables, nunca sus valores). */
export const EXPLICACION_MOTIVO_SIN_HUB: Record<MotivoSinHub, string> = {
  desactivado: "SIGNALR_HUB_URL=off desactiva el tiempo real.",
  sin_configurar: "No hay SIGNALR_HUB_URL ni VITE_API_URL en este entorno.",
  url_invalida: "SIGNALR_HUB_URL o VITE_API_URL no es una URL http(s) válida.",
  requiere_https:
    "En producción el Hub exige https://: SIGNALR_HUB_URL o VITE_API_URL usa http:// con un anfitrión no local.",
  url_con_credenciales: "La URL del Hub no puede llevar usuario, contraseña, parámetros ni fragmento.",
};

/**
 * Evalúa la URL del Hub: `SIGNALR_HUB_URL` si está definida o `VITE_API_URL` +
 * `/hubs/tiempo-real`. `SIGNALR_HUB_URL=off` desactiva el tiempo real (la app sigue con
 * sus consultas HTTP). En producción solo se admite HTTPS (el ticket no debe viajar sin
 * cifrar), salvo localhost.
 * @param entorno Variables de entorno (process.env).
 * @returns La URL, o null y el motivo.
 */
export function evaluarUrlHub(
  entorno: Entorno,
): { url: string; motivo: null } | { url: null; motivo: MotivoSinHub } {
  const sinHub = (motivo: MotivoSinHub) => ({ url: null, motivo }) as const;
  const explicita = entorno.SIGNALR_HUB_URL?.trim();
  if (explicita && explicita.toLowerCase() === "off") {
    return sinHub("desactivado");
  }

  const base = entorno.VITE_API_URL?.trim().replace(/\/+$/, "");
  const candidata = explicita || (base ? `${base}${RUTA_HUB_TIEMPO_REAL}` : "");
  if (!candidata) {
    return sinHub("sin_configurar");
  }

  let url: URL;
  try {
    url = new URL(candidata);
  } catch {
    return sinHub("url_invalida");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return sinHub("url_invalida");
  }
  if (
    url.protocol === "http:" &&
    entorno.NODE_ENV === "production" &&
    !ANFITRIONES_LOCALES.has(url.hostname)
  ) {
    return sinHub("requiere_https");
  }
  if (url.username || url.password || url.search || url.hash) {
    return sinHub("url_con_credenciales");
  }

  return { url: url.toString().replace(/\/+$/, ""), motivo: null };
}

/**
 * URL del Hub o null si no hay una válida (ver evaluarUrlHub).
 * @param entorno Variables de entorno (process.env).
 */
export function urlHubTiempoReal(entorno: Entorno): string | null {
  return evaluarUrlHub(entorno).url;
}

/**
 * Fuente de `connect-src` para el WebSocket del Hub (`wss://anfitrión`, o `ws://` en HTTP).
 * @param url Resultado de urlHubTiempoReal.
 * @returns Origen WebSocket o null.
 */
export function origenWebSocketHub(url: string | null): string | null {
  if (!url) {
    return null;
  }
  const { protocol, host } = new URL(url);
  return `${protocol === "https:" ? "wss:" : "ws:"}//${host}`;
}
