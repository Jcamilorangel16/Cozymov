import { getDbPool } from "../../../lib/db";
import type { DatosNuevoViaje, FiltrosViajes } from "../../../validaciones/viajes";

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
