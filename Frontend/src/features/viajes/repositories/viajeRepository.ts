// Ejecuta las consultas persistentes del dominio de viajes.
import { getDbPool } from "../../../lib/db";
import type { DatosNuevoViaje, FiltrosViajes } from "../types/viajes";

/**
 * Comprueba que el vehículo pertenezca al usuario autenticado.
 * @param idVehiculo Identificador del vehículo.
 * @param idUsuario Identificador del usuario autenticado.
 * @returns Si el vehículo pertenece al usuario.
 */
export async function vehiculoPerteneceUsuario(
  idVehiculo: number,
  idUsuario: string,
) {
  const resultado = await getDbPool().query(
    "SELECT 1 FROM vehiculo WHERE id_vehiculo = $1 AND id_usuario = $2 LIMIT 1",
    [idVehiculo, idUsuario],
  );

  return resultado.rows.length > 0;
}

/**
 * Inserta un viaje activo y devuelve la fila creada.
 * @param datos Datos validados del nuevo viaje.
 * @returns Fila del viaje insertado.
 */
export async function insertarViaje(datos: DatosNuevoViaje) {
  const resultado = await getDbPool().query(
    `INSERT INTO viaje (
       id_usuario, id_vehiculo, origen, destino, punto_encuentro,
       precio_pasaje, cupos_disponibles, fecha_salida, hora_salida,
       informacion_adicional, estado
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'activo')
     RETURNING id_viaje, id_usuario, id_vehiculo, origen, destino,
               punto_encuentro, precio_pasaje, cupos_disponibles,
               fecha_salida, hora_salida, informacion_adicional,
               estado, fecha_creacion`,
    [
      datos.id_usuario,
      datos.id_vehiculo,
      datos.origen,
      datos.destino,
      datos.punto_encuentro,
      datos.precio_pasaje,
      datos.cupos_disponibles,
      datos.fecha_salida,
      datos.hora_salida,
      datos.informacion_adicional,
    ],
  );

  return resultado.rows[0];
}

/**
 * Obtiene el viaje activo más reciente de un usuario.
 * @param idUsuario Identificador del usuario.
 * @returns Viaje activo o null si no existe.
 */
export async function obtenerViajeActivoPorUsuario(idUsuario: string) {
  const resultado = await getDbPool().query(
    `SELECT * FROM viaje
     WHERE id_usuario = $1 AND estado = 'activo'
     ORDER BY id_viaje DESC
     LIMIT 1`,
    [idUsuario],
  );

  return resultado.rows[0] ?? null;
}

/**
 * Lista los viajes activos que coinciden con los filtros opcionales.
 * @param filtros Criterios de origen, destino y fecha.
 * @returns Filas de viajes con datos públicos del conductor.
 */
export async function listarViajesActivos(filtros: FiltrosViajes) {
  const valores: string[] = [];
  const condiciones = ["v.estado = 'activo'"];

  if (filtros.origen) {
    valores.push(filtros.origen);
    condiciones.push(`POSITION(LOWER($${valores.length}) IN LOWER(v.origen)) > 0`);
  }
  if (filtros.destino) {
    valores.push(filtros.destino);
    condiciones.push(`POSITION(LOWER($${valores.length}) IN LOWER(v.destino)) > 0`);
  }
  if (filtros.fecha) {
    valores.push(filtros.fecha);
    condiciones.push(`v.fecha_salida = $${valores.length}::date`);
  }

  const resultado = await getDbPool().query(
    `SELECT v.*, u.primer_nombre, u.primer_apellido
     FROM viaje v
     JOIN usuario u ON v.id_usuario = u.id_usuario
     WHERE ${condiciones.join(" AND ")}
     ORDER BY v.fecha_salida ASC, v.hora_salida ASC`,
    valores,
  );

  return resultado.rows;
}
