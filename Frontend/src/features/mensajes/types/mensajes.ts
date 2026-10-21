// Define la forma de los datos usados por la mensajería.

/** Datos normalizados para crear un mensaje entre usuarios. */
export interface DatosMensaje {
  id_emisor: string;
  id_receptor: string;
  contenido: string;
}
