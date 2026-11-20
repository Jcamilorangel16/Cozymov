// Catálogo de tipos de vehículo aceptados por el formulario y la API.

export const TIPOS_VEHICULO = [
  "Automovil",
  "Moto",
  "Bicicleta electrica",
] as const;

export const TIPOS_ARCHIVO_PERMITIDOS = {
  imagen: {
    accept: "image/*",
    mimePrefix: "image/",
  },
  pdf: {
    accept: "application/pdf",
    mimeType: "application/pdf",
  },
} as const;

export const MAX_TAMANO_ARCHIVO_MB = 5;
export const MAX_TAMANO_ARCHIVO_BYTES = MAX_TAMANO_ARCHIVO_MB * 1024 * 1024;

// El formulario usa etiquetas legibles; la API guarda y devuelve el valor canónico.
export const TIPO_API_POR_UI = {
  Automovil: "automovil",
  Moto: "moto",
  "Bicicleta electrica": "bicicleta_electrica",
} as const;

export const TIPO_UI_POR_API: Record<string, (typeof TIPOS_VEHICULO)[number]> = {
  automovil: "Automovil",
  moto: "Moto",
  bicicleta_electrica: "Bicicleta electrica",
};

/** Archivos del registro: campo del formulario -> clase de archivo y tipos a los que aplica. */
export const ARCHIVOS_VEHICULO = [
  { campo: "foto_frontal", clase: "imagen", tipos: ["Automovil", "Moto", "Bicicleta electrica"] },
  { campo: "foto_lateral", clase: "imagen", tipos: ["Automovil", "Moto", "Bicicleta electrica"] },
  { campo: "foto_perfil", clase: "imagen", tipos: ["Automovil", "Moto", "Bicicleta electrica"] },
  { campo: "foto_placa", clase: "imagen", tipos: ["Automovil", "Moto"] },
  { campo: "foto_licencia", clase: "imagen", tipos: ["Automovil", "Moto"] },
  { campo: "doc_tecnomecanica", clase: "pdf", tipos: ["Automovil", "Moto"] },
  { campo: "doc_soat", clase: "pdf", tipos: ["Automovil", "Moto"] },
] as const;
