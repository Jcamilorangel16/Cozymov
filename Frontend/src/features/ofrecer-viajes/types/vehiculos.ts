// Define el formato normalizado de los vehículos registrados por usuarios.

import { TIPOS_VEHICULO } from "../constants/vehiculos";

/** Datos validados para persistir un vehículo. */
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
