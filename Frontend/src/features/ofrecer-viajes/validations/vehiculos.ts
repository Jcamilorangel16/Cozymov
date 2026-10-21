// Define tipos y reglas de validación para el registro de vehículos.
import { TIPOS_VEHICULO } from "../constants/vehiculos";
import type { DatosNuevoVehiculo } from "../types/vehiculos";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

/**
 * Comprueba que el valor sea un objeto JSON no nulo ni una lista.
 * @param valor Valor que se va a revisar.
 * @returns Si el valor puede tratarse como un registro.
 */
function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Comprueba que el tipo pertenezca al catálogo de vehículos aceptado.
 * @param valor Tipo recibido.
 * @returns Si coincide con uno de los tipos permitidos.
 */
function esTipoVehiculo(
  valor: unknown,
): valor is (typeof TIPOS_VEHICULO)[number] {
  return typeof valor === "string" &&
    TIPOS_VEHICULO.some((tipoVehiculo) => tipoVehiculo === valor);
}

/**
 * Valida que el identificador del usuario sea texto no vacío y acotado.
 * @param valor Identificador recibido.
 * @returns Si el identificador puede usarse en la consulta.
 */
export function validarIdUsuarioVehiculo(valor: unknown): valor is string {
  return typeof valor === "string" && Boolean(valor.trim()) && valor.length <= 20;
}

/**
 * Valida y normaliza los datos del vehículo recibido.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Datos de vehículo normalizados o error de validación.
 */
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
