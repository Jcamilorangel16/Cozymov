// Define tipos y reglas de validación para el registro de vehículos.
import {
  ARCHIVOS_VEHICULO,
  MAX_TAMANO_ARCHIVO_BYTES,
  MAX_TAMANO_ARCHIVO_MB,
  TIPO_API_POR_UI,
  TIPOS_ARCHIVO_PERMITIDOS,
  TIPOS_VEHICULO,
} from "../constants/vehiculos";
import type {
  DatosNuevoVehiculo,
  TipoArchivoVehiculo,
} from "../types/vehiculos";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

/**
 * Valida el MIME y el tamaño de un archivo seleccionado para el vehículo.
 * @param archivo Archivo seleccionado.
 * @param tipoArchivo Tipo de contenido permitido para el campo.
 * @returns Mensaje de error o null si el archivo es válido.
 */
export function validarArchivoVehiculo(
  archivo: File,
  tipoArchivo: TipoArchivoVehiculo,
): string | null {
  const tipoValido = tipoArchivo === "imagen"
    ? archivo.type.startsWith(TIPOS_ARCHIVO_PERMITIDOS.imagen.mimePrefix)
    : archivo.type === TIPOS_ARCHIVO_PERMITIDOS.pdf.mimeType;

  if (!tipoValido) {
    return tipoArchivo === "imagen"
      ? "Selecciona un archivo de imagen."
      : "Selecciona un archivo PDF.";
  }
  if (archivo.size > MAX_TAMANO_ARCHIVO_BYTES) {
    return `El archivo no debe superar ${MAX_TAMANO_ARCHIVO_MB} MB.`;
  }
  return null;
}

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
  return (
    typeof valor === "string" &&
    Boolean(valor.trim()) &&
    valor.trim().length <= 20
  );
}

/**
 * Valida y normaliza los datos del vehículo recibido.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Datos de vehículo normalizados o error de validación.
 */
export function validarNuevoVehiculo(
  valor: unknown,
  idUsuarioAutenticado: string,
): ResultadoValidacion<DatosNuevoVehiculo> {
  if (!esRegistro(valor)) {
    return { valido: false, error: "Cuerpo de solicitud inválido." };
  }

  const {
    tipo,
    modelo,
    capacidad,
    ruta_cotidiana,
    foto_vehiculo,
    numero_puertas,
    modalidad,
  } = valor;

  if (!validarIdUsuarioVehiculo(idUsuarioAutenticado)) {
    return {
      valido: false,
      error: "La sesión no contiene un identificador de usuario válido.",
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
      id_usuario: idUsuarioAutenticado.trim(),
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

const CAMPOS_TEXTO_POR_TIPO: Record<string, string[]> = {
  Automovil: ["numero_puertas"],
  Moto: ["modalidad"],
  "Bicicleta electrica": [
    "numero_serie",
    "velocidad_maxima",
    "capacidad_peso",
    "capacidad_vehicular",
    "casco",
    "chaleco",
    "luces",
  ],
};

const NOMBRE_BACKEND: Record<string, string> = {
  marca: "Marca",
  modelo: "Modelo",
  capacidad: "Capacidad",
  numero_puertas: "NumeroPuertas",
  modalidad: "Modalidad",
  numero_serie: "NumeroSerie",
  velocidad_maxima: "VelocidadMaxima",
  capacidad_peso: "CapacidadPeso",
  capacidad_vehicular: "CapacidadVehicular",
  casco: "Casco",
  chaleco: "Chaleco",
  luces: "Luces",
  foto_frontal: "FotoFrontal",
  foto_lateral: "FotoLateral",
  foto_perfil: "FotoPerfil",
  foto_placa: "FotoPlaca",
  foto_licencia: "FotoLicencia",
  doc_tecnomecanica: "DocTecnomecanica",
  doc_soat: "DocSoat",
};

/**
 * Valida el FormData del navegador y arma el multipart que se envía a la API.
 * Es un primer filtro (tipo, textos, MIME y tamaño); el servidor valida además
 * el contenido real de los archivos. Solo reenvía los campos del tipo elegido.
 * @param entrada FormData recibido del navegador.
 * @param idUsuarioAutenticado Usuario de la sesión (nunca el del cliente).
 * @returns FormData para la API o error de validación.
 */
export function construirFormDataVehiculo(
  entrada: FormData,
  idUsuarioAutenticado: string,
): ResultadoValidacion<FormData> {
  if (!validarIdUsuarioVehiculo(idUsuarioAutenticado)) {
    return {
      valido: false,
      error: "La sesión no contiene un identificador de usuario válido.",
    };
  }

  const tipo = entrada.get("tipo");
  if (!esTipoVehiculo(tipo)) {
    return { valido: false, error: "El tipo de vehículo no es válido." };
  }

  const texto = (campo: string) => {
    const valor = entrada.get(campo);
    return typeof valor === "string" ? valor.trim() : "";
  };

  for (const [campo, nombre, maximo] of [
    ["marca", "marca", 100],
    ["modelo", "modelo", 50],
  ] as const) {
    if (!texto(campo) || texto(campo).length > maximo) {
      return {
        valido: false,
        error: `${nombre} es obligatorio y debe tener máximo ${maximo} caracteres.`,
      };
    }
  }
  const capacidad = Number(texto("capacidad"));
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 32767) {
    return {
      valido: false,
      error: "capacidad debe ser un entero positivo (máximo 32767).",
    };
  }

  const salida = new FormData();
  salida.set("IdUsuario", idUsuarioAutenticado.trim());
  salida.set("Tipo", TIPO_API_POR_UI[tipo]);
  for (const campo of ["marca", "modelo", "capacidad"]) {
    salida.set(NOMBRE_BACKEND[campo], texto(campo));
  }
  for (const campo of CAMPOS_TEXTO_POR_TIPO[tipo]) {
    const valor = texto(campo);
    if (valor) salida.set(NOMBRE_BACKEND[campo], valor);
  }

  for (const { campo, clase, tipos } of ARCHIVOS_VEHICULO) {
    if (!(tipos as readonly string[]).includes(tipo)) continue;
    const archivo = entrada.get(campo);
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { valido: false, error: `Falta el archivo ${campo}.` };
    }
    const error = validarArchivoVehiculo(archivo, clase);
    if (error) return { valido: false, error: `${campo}: ${error}` };
    salida.set(NOMBRE_BACKEND[campo], archivo, archivo.name);
  }

  return { valido: true, datos: salida };
}
