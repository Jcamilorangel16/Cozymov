export interface DatosMensaje {
  id_emisor: string;
  id_receptor: string;
  contenido: string;
}

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

function esIdUsuario(valor: unknown): valor is string {
  return typeof valor === "string" && Boolean(valor.trim()) && valor.length <= 20;
}

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

export function esMensajeListoParaEnviar(texto: string, enviando: boolean) {
  return Boolean(texto.trim()) && !enviando && texto.length <= 500;
}
