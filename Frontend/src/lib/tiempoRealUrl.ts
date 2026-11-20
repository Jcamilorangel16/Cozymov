// Dirección pública del Hub de tiempo real. La usan la ruta de tickets (para decírsela al
// navegador) y next.config.ts (para permitirla en la CSP). No contiene secretos.

/** Ruta del Hub en el backend (TiempoRealHub.Ruta). */
export const RUTA_HUB_TIEMPO_REAL = "/hubs/tiempo-real";

type Entorno = Record<string, string | undefined>;

const ANFITRIONES_LOCALES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * URL del Hub: `SIGNALR_HUB_URL` si está definida o `VITE_API_URL` + `/hubs/tiempo-real`.
 * `SIGNALR_HUB_URL=off` desactiva el tiempo real (la app sigue con sus consultas HTTP).
 * En producción solo se admite HTTPS (el ticket no debe viajar sin cifrar), salvo localhost.
 * @param entorno Variables de entorno (process.env).
 * @returns URL absoluta o null si no hay una válida.
 */
export function urlHubTiempoReal(entorno: Entorno): string | null {
  const explicita = entorno.SIGNALR_HUB_URL?.trim();
  if (explicita && explicita.toLowerCase() === "off") {
    return null;
  }

  const base = entorno.VITE_API_URL?.trim().replace(/\/+$/, "");
  const candidata = explicita || (base ? `${base}${RUTA_HUB_TIEMPO_REAL}` : "");
  if (!candidata) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidata);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  if (
    url.protocol === "http:" &&
    entorno.NODE_ENV === "production" &&
    !ANFITRIONES_LOCALES.has(url.hostname)
  ) {
    return null;
  }
  if (url.username || url.password || url.search || url.hash) {
    return null;
  }

  return url.toString().replace(/\/+$/, "");
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
