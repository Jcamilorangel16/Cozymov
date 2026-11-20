// Define el formato normalizado de los vehículos registrados por usuarios.

import { TIPOS_VEHICULO } from "../constants/vehiculos";
import type { TIPOS_ARCHIVO_PERMITIDOS } from "../constants/vehiculos";

export type TipoArchivoVehiculo = keyof typeof TIPOS_ARCHIVO_PERMITIDOS;

/** Estado local del formulario; los archivos permanecen como objetos File. */
export interface EstadoFormularioVehiculo {
  tipo: (typeof TIPOS_VEHICULO)[number] | "";
  marca: string;
  modelo: string;
  capacidad: string;
  rutaCotidiana: string;
  fotoFrontal: File | null;
  fotoLateral: File | null;
  fotoPerfil: File | null;
  numeroPuertas?: string;
  modalidad?: string;
  numeroSerie?: string;
  velocidadMaxima?: string;
  capacidadPeso?: string;
  capacidadVehicular?: boolean;
  casco?: boolean;
  chaleco?: boolean;
  luces?: boolean;
  fotoPlaca?: File | null;
  fotoLicencia?: File | null;
  docTecnomecanica?: File | null;
  docSoat?: File | null;
}

/** Datos validados para persistir un vehículo. */
export interface DatosNuevoVehiculo {
  id_usuario: string;
  tipo: (typeof TIPOS_VEHICULO)[number];
  modelo: string;
  capacidad: number;
  ruta_cotidiana: string | null;
  numero_puertas?: number;
  modalidad?: string;
}
