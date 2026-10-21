export const TIPOS_VEHICULO = [
  "Automovil",
  "Moto",
  "Bicicleta electrica",
] as const;

export interface DatosNuevoVehiculo {
  id_usuario: string;
  tipo: (typeof TIPOS_VEHICULO)[number];
  modelo: string;
  capacidad: number;
  ruta_cotidiana: string | null;
  foto_vehiculo: string | null;
  numero_puertas?: number;
  modalidad?: string;
}

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function esTipoVehiculo(
  valor: unknown,
): valor is (typeof TIPOS_VEHICULO)[number] {
  return typeof valor === "string" &&
    TIPOS_VEHICULO.some((tipoVehiculo) => tipoVehiculo === valor);
}

export function validarIdUsuarioVehiculo(valor: unknown): valor is string {
  return typeof valor === "string" && Boolean(valor.trim()) && valor.length <= 20;
}

export function validarNuevoVehiculo(
  valor: unknown,
): ResultadoValidacion<DatosNuevoVehiculo> {
  if (!esRegistro(valor)) {
    return { valido: false, error: "Cuerpo de solicitud inválido." };
  }

  const {
    id_usuario,
    tipo,
    modelo,
    capacidad,
    ruta_cotidiana,
    foto_vehiculo,
    numero_puertas,
    modalidad,
  } = valor;

  if (!validarIdUsuarioVehiculo(id_usuario)) {
    return {
      valido: false,
      error: "id_usuario es obligatorio y debe tener máximo 20 caracteres.",
    };
  }
  if (!esTipoVehiculo(tipo)) {
    return { valido: false, error: "El tipo de vehículo no es válido." };
  }
  if (typeof modelo !== "string" || !modelo.trim() || modelo.length > 50) {
    return {
      valido: false,
      error: "modelo es obligatorio y debe tener máximo 50 caracteres.",
    };
  }
  if (
    typeof capacidad !== "number" ||
    !Number.isInteger(capacidad) ||
    capacidad <= 0 ||
    capacidad > 32767
  ) {
    return {
      valido: false,
      error: "capacidad debe ser un entero positivo (máximo 32767).",
    };
  }
  if (
    ruta_cotidiana != null &&
    (typeof ruta_cotidiana !== "string" || ruta_cotidiana.length > 255)
  ) {
    return {
      valido: false,
      error: "ruta_cotidiana debe tener máximo 255 caracteres.",
    };
  }
  if (
    foto_vehiculo != null &&
    (typeof foto_vehiculo !== "string" || foto_vehiculo.length > 255)
  ) {
    return {
      valido: false,
      error: "foto_vehiculo debe tener máximo 255 caracteres.",
    };
  }
  if (
    tipo === "Automovil" &&
    (typeof numero_puertas !== "number" ||
      ![2, 3, 4, 5].includes(numero_puertas))
  ) {
    return { valido: false, error: "El número de puertas no es válido." };
  }
  if (
    tipo === "Moto" &&
    (typeof modalidad !== "string" || !modalidad.trim() || modalidad.length > 20)
  ) {
    return {
      valido: false,
      error: "La modalidad de la moto es obligatoria.",
    };
  }

  return {
    valido: true,
    datos: {
      id_usuario: id_usuario.trim(),
      tipo,
      modelo: modelo.trim(),
      capacidad,
      ruta_cotidiana: typeof ruta_cotidiana === "string" ? ruta_cotidiana : null,
      foto_vehiculo: typeof foto_vehiculo === "string" ? foto_vehiculo : null,
      ...(tipo === "Automovil" &&
        typeof numero_puertas === "number" && { numero_puertas }),
      ...(tipo === "Moto" &&
        typeof modalidad === "string" && { modalidad: modalidad.trim() }),
    },
  };
}
