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
