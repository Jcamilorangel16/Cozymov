// Define los datos y las reglas de validación del dominio de mensajería.
import type { DatosMensaje } from "../types/mensajes";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

/**
 * Comprueba que un identificador sea texto no vacío y tenga longitud válida.
 * @param valor Valor que se valida como identificador.
 * @returns Si el identificador es válido.
 */
function esIdUsuario(valor: unknown): valor is string {
  return typeof valor === "string" && Boolean(valor.trim()) && valor.length <= 20;
}

/**
 * Valida los dos usuarios que participan en una consulta de conversación.
 * @param usuario1 Identificador del primer participante.
 * @param usuario2 Identificador del segundo participante.
 * @returns Participantes normalizados o error de validación.
 */
export function validarParticipantesMensaje(
  usuario1: string | null,
  usuario2: string | null,
): ResultadoValidacion<{ usuario1: string; usuario2: string }> {
  if (!esIdUsuario(usuario1) || !esIdUsuario(usuario2)) {
    return {
      valido: false,
      error: "Los dos identificadores de usuario son obligatorios.",
    };
  }

  return {
    valido: true,
    datos: { usuario1: usuario1.trim(), usuario2: usuario2.trim() },
  };
}

/**
 * Valida y normaliza los campos del mensaje a guardar.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Datos del mensaje o error de validación.
 */
export function validarDatosMensaje(
  valor: unknown,
): ResultadoValidacion<DatosMensaje> {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return { valido: false, error: "Los datos del mensaje no son válidos." };
  }

  const datos = valor as Record<string, unknown>;
  if (!esIdUsuario(datos.id_emisor) || !esIdUsuario(datos.id_receptor)) {
    return {
      valido: false,
      error: "El emisor y el receptor son obligatorios.",
    };
  }
  if (
    typeof datos.contenido !== "string" ||
    !datos.contenido.trim() ||
    datos.contenido.length > 500
  ) {
    return {
      valido: false,
      error: "El mensaje es obligatorio y no puede superar 500 caracteres.",
    };
  }

  return {
    valido: true,
    datos: {
      id_emisor: datos.id_emisor.trim(),
      id_receptor: datos.id_receptor.trim(),
      contenido: datos.contenido.trim(),
    },
  };
}

/**
 * Indica si un texto puede enviarse con el estado actual del formulario.
 * @param texto Contenido escrito por el usuario.
 * @param enviando Indica si hay otro envío en curso.
 * @returns Si el texto cumple las condiciones de envío.
 */
export function esMensajeListoParaEnviar(texto: string, enviando: boolean) {
  return Boolean(texto.trim()) && !enviando && texto.length <= 500;
}
