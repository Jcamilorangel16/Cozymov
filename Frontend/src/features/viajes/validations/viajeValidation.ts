export interface DatosNuevoViaje {
  id_usuario: string;
  id_vehiculo: number;
  origen: string;
  destino: string;
  punto_encuentro: string;
  precio_pasaje: number;
  cupos_disponibles: number;
  fecha_salida: string;
  hora_salida: string;
  informacion_adicional: string | null;
}

export interface FiltrosViajes {
  origen: string;
  destino: string;
  fecha: string;
}

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTextoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

export function validarDatosNuevoViaje(
  body: unknown,
): ResultadoValidacion<DatosNuevoViaje> {
  if (!esRegistro(body)) {
    return { valido: false, error: "El cuerpo de la solicitud es inválido." };
  }

  const {
    id_usuario,
    id_vehiculo,
    origen,
    destino,
    punto_encuentro,
    precio_pasaje,
    cupos_disponibles,
    fecha_salida,
    hora_salida,
    informacion_adicional,
  } = body;

  if (!esTextoValido(id_usuario) || id_usuario.length > 20) {
    return {
      valido: false,
      error: "id_usuario es obligatorio y debe tener máximo 20 caracteres.",
    };
  }

  const idVehiculo = Number(id_vehiculo);
  if (!Number.isInteger(idVehiculo) || idVehiculo <= 0) {
    return { valido: false, error: "id_vehiculo debe ser un identificador válido." };
  }

  if (!esTextoValido(origen) || !esTextoValido(destino)) {
    return { valido: false, error: "El origen y el destino son obligatorios." };
  }
  if (origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
    return {
      valido: false,
      error: "El origen y el destino deben ser diferentes.",
    };
  }
  if (!esTextoValido(punto_encuentro)) {
    return { valido: false, error: "El punto de encuentro es obligatorio." };
  }

  const precio = Number(precio_pasaje);
  if (!Number.isSafeInteger(precio) || precio <= 0) {
    return {
      valido: false,
      error: "El precio del pasaje debe ser un número entero mayor a 0 pesos.",
    };
  }

  const cupos = Number(cupos_disponibles);
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > 7) {
    return {
      valido: false,
      error: "Los cupos disponibles deben estar entre 1 y 7.",
    };
  }

  if (!esTextoValido(fecha_salida) || !esTextoValido(hora_salida)) {
    return {
      valido: false,
      error: "La fecha y la hora de salida son obligatorias.",
    };
  }

  const salida = new Date(`${fecha_salida}T${hora_salida}`);
  const ahora = new Date();
  ahora.setSeconds(0, 0);
  if (Number.isNaN(salida.getTime()) || salida < ahora) {
    return {
      valido: false,
      error: "La fecha y hora de salida no pueden estar en el pasado.",
    };
  }

  const infoAdicional =
    typeof informacion_adicional === "string" && informacion_adicional.trim()
      ? informacion_adicional.trim()
      : null;
  if (infoAdicional && infoAdicional.length > 500) {
    return {
      valido: false,
      error: "La información adicional no puede superar los 500 caracteres.",
    };
  }

  return {
    valido: true,
    datos: {
      id_usuario: id_usuario.trim(),
      id_vehiculo: idVehiculo,
      origen: origen.trim(),
      destino: destino.trim(),
      punto_encuentro: punto_encuentro.trim(),
      precio_pasaje: precio,
      cupos_disponibles: cupos,
      fecha_salida: fecha_salida.trim(),
      hora_salida: hora_salida.trim(),
      informacion_adicional: infoAdicional,
    },
  };
}

export function validarFiltrosViajes(
  searchParams: URLSearchParams,
): ResultadoValidacion<FiltrosViajes> {
  const origen = searchParams.get("origen")?.trim() ?? "";
  const destino = searchParams.get("destino")?.trim() ?? "";
  const fecha = searchParams.get("fecha")?.trim() ?? "";

  if (origen.length > 150 || destino.length > 150) {
    return {
      valido: false,
      error: "El origen y el destino no pueden superar 150 caracteres.",
    };
  }

  if (
    fecha &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) ||
      Number.isNaN(Date.parse(`${fecha}T00:00:00.000Z`)) ||
      new Date(`${fecha}T00:00:00.000Z`).toISOString().slice(0, 10) !== fecha)
  ) {
    return {
      valido: false,
      error: "La fecha de salida no tiene un formato válido.",
    };
  }

  return { valido: true, datos: { origen, destino, fecha } };
}
