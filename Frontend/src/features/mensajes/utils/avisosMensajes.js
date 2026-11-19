// Lógica pura para avisar de mensajes nuevos a partir de la lista de chats con «no leídos».

/** Largo máximo del texto del mensaje que se muestra en la notificación. */
const MAX_TEXTO = 120;

/**
 * Compara dos consultas de la lista de chats y devuelve los chats con mensajes nuevos.
 * Un chat tiene mensajes nuevos cuando sus «no leídos» aumentaron respecto a la consulta anterior.
 * La primera consulta (sin anterior) solo sirve de referencia: no avisa de lo que ya estaba.
 * @param {Array<{id: string, noLeidos?: number}>|null} previos Chats de la consulta anterior, o null si es la primera.
 * @param {Array<{id: string, nombre?: string, ultimoMensaje?: string, noLeidos?: number}>} actuales Chats actuales.
 * @returns {Array<{id: string, nombre: string, texto: string, cantidad: number}>} Chats con mensajes nuevos.
 */
export function detectarMensajesNuevos(previos, actuales) {
  if (!Array.isArray(previos) || !Array.isArray(actuales)) return [];
  const antes = new Map(previos.map((chat) => [String(chat.id), Number(chat.noLeidos) || 0]));

  const nuevos = [];
  for (const chat of actuales) {
    const ahora = Number(chat.noLeidos) || 0;
    const cantidad = ahora - (antes.get(String(chat.id)) ?? 0);
    if (cantidad > 0) {
      nuevos.push({
        id: String(chat.id),
        nombre: String(chat.nombre ?? "").trim() || "un contacto",
        texto: String(chat.ultimoMensaje ?? ""),
        cantidad,
      });
    }
  }
  return nuevos;
}

/**
 * Recorta un mensaje largo para mostrarlo en una notificación.
 * @param {string} texto Contenido del mensaje.
 * @returns {string} Texto de hasta 120 caracteres, con «…» si se cortó.
 */
export function resumirMensaje(texto) {
  const limpio = String(texto ?? "").replace(/\s+/g, " ").trim();
  return limpio.length > MAX_TEXTO ? `${limpio.slice(0, MAX_TEXTO - 1).trimEnd()}…` : limpio;
}

/**
 * Título y texto del aviso para uno o varios chats con mensajes nuevos.
 * @param {Array<{nombre: string, texto: string, cantidad: number}>} nuevos Resultado de detectarMensajesNuevos (no vacío).
 * @returns {{titulo: string, texto: string}} Contenido del aviso.
 */
export function textoAvisoMensajes(nuevos) {
  if (nuevos.length === 1) {
    const [chat] = nuevos;
    return {
      titulo:
        chat.cantidad > 1
          ? `${chat.cantidad} mensajes nuevos de ${chat.nombre}`
          : `Nuevo mensaje de ${chat.nombre}`,
      texto: resumirMensaje(chat.texto),
    };
  }
  const nombres = nuevos.map((chat) => chat.nombre);
  const lista =
    nombres.length <= 2
      ? nombres.join(" y ")
      : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
  return { titulo: "Mensajes nuevos", texto: `Tienes mensajes nuevos de ${lista}.` };
}
