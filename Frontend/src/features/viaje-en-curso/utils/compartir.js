// Arma el mensaje con el que el pasajero comparte su viaje por WhatsApp.
import { formatearFecha, formatearPrecioViaje } from "../../buscar-viajes/utils/viajes.js";

/**
 * Texto con la información del viaje para enviarlo a un contacto. Solo usa
 * lo que el pasajero ya ve en pantalla; no incluye ids ni datos de la cuenta.
 * @param {object} viaje Viaje en curso normalizado por /api/viajes/en-curso.
 * @param {string} estado Estado que muestra la vista («En trayecto», etc.).
 * @returns Mensaje en texto plano.
 */
export function textoCompartirViaje(viaje, estado) {
  const texto = (valor) => (typeof valor === "string" && valor.trim() ? valor.trim() : "No disponible");
  const salida = viaje.fecha_salida
    ? `${formatearFecha(viaje.fecha_salida)}${viaje.hora_salida ? ` a las ${viaje.hora_salida}` : ""}`
    : "No disponible";

  return [
    "🚗 Te comparto mi viaje en Cozymov",
    "",
    `📍 Origen: ${texto(viaje.origen)}`,
    `🏁 Destino: ${texto(viaje.destino)}`,
    `🕒 Salida: ${salida}`,
    `👤 Conductor: ${texto(viaje.nombre_conductor)}`,
    `💵 Precio: ${formatearPrecioViaje(viaje.precio_pasaje)}`,
    `ℹ️ Estado: ${texto(estado)}`,
  ].join("\n");
}

/**
 * Enlace de WhatsApp que abre el selector de contactos con el mensaje escrito.
 * Sin número, WhatsApp deja elegir a quién enviarlo.
 * @param {string} mensaje Texto a enviar.
 * @returns URL de wa.me.
 */
export function urlCompartirWhatsApp(mensaje) {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}
