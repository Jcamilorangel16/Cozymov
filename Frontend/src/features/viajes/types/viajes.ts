// Define los datos de entrada y filtros propios del dominio de viajes.

/** Datos normalizados requeridos para publicar un viaje. */
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

/** Filtros opcionales para consultar viajes activos. */
export interface FiltrosViajes {
  origen: string;
  destino: string;
  fecha: string;
}
