// Define los tipos y validaciones compartidos para viajes.
import type { DatosNuevoViaje, FiltrosViajes } from "../types/viajes";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

/**
 * Comprueba que el valor sea un objeto JSON no nulo ni una lista.
 * @param valor Valor desconocido que se va a revisar.
 * @returns Si el valor puede tratarse como un registro.
 */
function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Comprueba que el valor sea texto no vacío después de recortarlo.
 * @param valor Valor que se valida.
 * @returns Si el valor es una cadena utilizable.
 */
function esTextoValido(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/** Opciones de la validación de publicación; solo existen para poder probarla. */
export interface OpcionesValidacionViaje {
  /** Momento de referencia (por defecto, ahora). */
  ahora?: Date;
  /**
   * Días de margen antes de «hoy». El navegador valida con su hora local (0). El servidor
   * puede estar en otra zona horaria y usa 1 para no rechazar «hoy» por la diferencia horaria.
   */
  toleranciaDias?: number;
}

/**
 * Valida y normaliza los datos de publicación de un viaje.
 * La fecha de salida puede ser hoy a cualquier hora; solo se rechazan días anteriores.
 * @param body Cuerpo desconocido de la solicitud.
 * @param idUsuarioAutenticado Usuario de la sesión.
 * @param opciones Momento de referencia y margen de días.
 * @returns Datos del viaje o error de validación.
 */
export function validarDatosNuevoViaje(
  body: unknown,
  idUsuarioAutenticado: string,
  { ahora = new Date(), toleranciaDias = 0 }: OpcionesValidacionViaje = {},
): ResultadoValidacion<DatosNuevoViaje> {
  if (!esRegistro(body)) {
    return { valido: false, error: "El cuerpo de la solicitud es inválido." };
  }

  const {
    origen,
    destino,
    punto_encuentro,
    precio_pasaje,
    cupos_disponibles,
    fecha_salida,
    hora_salida,
    informacion_adicional,
  } = body;

  const idUsuario = idUsuarioAutenticado.trim();
  if (!esTextoValido(idUsuario) || idUsuario.length > 20) {
    return {
      valido: false,
      error: "La sesión no contiene un identificador de usuario válido.",
    };
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

  // 0 pesos es válido: es el «modo colaboración» (viaje sin cobro). Un valor
  // vacío no debe contarse como 0, por eso se rechaza explícitamente.
  const precioVacio =
    precio_pasaje === null ||
    precio_pasaje === undefined ||
    (typeof precio_pasaje === "string" && precio_pasaje.trim() === "");
  const precio = Number(precio_pasaje);
  if (precioVacio || !Number.isSafeInteger(precio) || precio < 0) {
    return {
      valido: false,
      error:
        "El precio del pasaje debe ser un número entero de 0 pesos o más (0 = modo colaboración).",
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
  if (Number.isNaN(salida.getTime())) {
    return {
      valido: false,
      error: "La fecha y la hora de salida no son válidas.",
    };
  }
  // Inicio del día de hoy (menos el margen): cualquier hora de hoy es válida.
  const inicioDeHoy = new Date(ahora);
  inicioDeHoy.setHours(0, 0, 0, 0);
  inicioDeHoy.setDate(inicioDeHoy.getDate() - toleranciaDias);
  if (salida < inicioDeHoy) {
    return {
      valido: false,
      error: "La fecha de salida no puede ser anterior a hoy.",
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
      id_usuario: idUsuario,
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

/**
 * Valida los filtros de ruta y fecha enviados en una consulta.
 * @param searchParams Parámetros de búsqueda de la URL.
 * @returns Filtros normalizados o error de validación.
 */
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

/**
 * Valida un identificador opcional usado para consultar el viaje del usuario.
 * @param idUsuario Identificador recibido desde la URL.
 * @returns Identificador normalizado o error de validación.
 */
export function validarIdUsuarioViaje(
  idUsuario: string | null,
): ResultadoValidacion<string | null> {
  if (idUsuario === null || idUsuario === "") {
    return { valido: true, datos: null };
  }
  if (!idUsuario.trim() || idUsuario.length > 20) {
    return {
      valido: false,
      error: "id_usuario debe tener máximo 20 caracteres.",
    };
  }
  return { valido: true, datos: idUsuario.trim() };
}

/**
 * Determina si el usuario puede aceptar un viaje según su estado conocido.
 * @param idUsuario Identificador del usuario activo.
 * @param validacionCompletada Indica si terminó la consulta de sus viajes.
 * @param tieneViajePublicado Indica si tiene un viaje publicado.
 * @returns Si la acción de aceptar debe estar habilitada.
 */
export function puedeAceptarViaje(
  idUsuario: string,
  validacionCompletada: boolean,
  tieneViajePublicado: boolean | null,
  tieneViajeEnCurso = false,
) {
  return (
    Boolean(idUsuario) &&
    validacionCompletada &&
    tieneViajePublicado === false &&
    !tieneViajeEnCurso
  );
}

/**
 * Determina si el usuario puede aceptar una solicitud de viaje: necesita sesión,
 * un vehículo registrado y no estar en un viaje en curso.
 * @param idUsuario Identificador del usuario activo.
 * @param tieneVehiculo Si tiene vehículo registrado (null si no se pudo comprobar).
 * @param tieneViajeEnCurso Si ya está en un viaje.
 * @returns Si la acción de aceptar la solicitud debe estar habilitada.
 */
export function puedeAceptarSolicitud(
  idUsuario: string,
  tieneVehiculo: boolean | null,
  tieneViajeEnCurso = false,
) {
  return Boolean(idUsuario) && tieneVehiculo === true && !tieneViajeEnCurso;
}

/**
 * Explica por qué no se puede aceptar una solicitud.
 * @param idUsuario Identificador del usuario activo.
 * @param tieneVehiculo Si tiene vehículo registrado (null si no se pudo comprobar).
 * @param tieneViajeEnCurso Si ya está en un viaje.
 * @returns Mensaje para la interfaz, o null si sí puede aceptar.
 */
export function motivoNoAceptarSolicitud(
  idUsuario: string,
  tieneVehiculo: boolean | null,
  tieneViajeEnCurso = false,
): string | null {
  if (!idUsuario) return "Inicia sesión para aceptar solicitudes.";
  if (tieneViajeEnCurso) return "Ya tienes un viaje en curso.";
  if (tieneVehiculo === null) return "No pudimos comprobar tu vehículo registrado.";
  if (!tieneVehiculo) return "Registra un vehículo para aceptar solicitudes.";
  return null;
}

/**
 * Devuelve el mensaje de acceso cuando faltan sesión o vehículo.
 * @param idUsuario Identificador del usuario activo.
 * @param idVehiculo Identificador del vehículo seleccionado.
 * @returns Mensaje de validación o null si puede continuar.
 */
export function validarPermisoPublicarViaje(
  idUsuario: string,
  idVehiculo: unknown,
): string | null {
  if (!idUsuario) return "Inicia sesión para poder publicar un viaje.";
  if (!idVehiculo) return "Debes registrar un vehículo antes de publicar un viaje.";
  return null;
}
