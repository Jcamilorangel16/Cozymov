import { getDbPool } from "../../../lib/db";

type ReservaViaje = {
  id_reserva: number;
  id_viaje: number;
  id_pasajero: number;
  origen: string;
  destino: string;
  fecha_hora_salida: string;
  costo: number;
  id_conductor: string;
  nombre_conductor: string;
};

export class ErrorReservaViaje extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ErrorReservaViaje";
  }
}

/**
 * Registra una reserva activa y descuenta un cupo en una sola transacción.
 * Serializa las reservas de cada usuario para impedir reservas concurrentes.
 */
export async function reservarViaje(idViaje: number, idPasajero: number) {
  const cliente = await getDbPool().connect();

  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT pg_advisory_xact_lock($1::bigint)", [idPasajero]);

    const usuario = await cliente.query(
      'SELECT 1 FROM "Usuarios" WHERE "IdPersonas" = $1 LIMIT 1',
      [idPasajero],
    );
    if (usuario.rowCount === 0) {
      throw new ErrorReservaViaje("El usuario de la sesión ya no existe.", 400);
    }

    const viajePublicado = await cliente.query(
      `SELECT 1 FROM viaje
       WHERE "IdUsuario" = $1 AND LOWER(estado) = 'activo'
       LIMIT 1`,
      [idPasajero],
    );
    if (viajePublicado.rowCount) {
      throw new ErrorReservaViaje(
        "Solo puedes aceptar un viaje si no tienes uno publicado.",
        409,
      );
    }

    const reservaExistente = await cliente.query(
      `SELECT 1 FROM reserva_viaje
       WHERE id_pasajero = $1 AND estado = 'activa'
       LIMIT 1`,
      [idPasajero],
    );
    if (reservaExistente.rowCount) {
      throw new ErrorReservaViaje("Ya tienes un viaje en curso.", 409);
    }

    const consultaViaje = await cliente.query(
      `SELECT v.id_viaje, v."IdUsuario" AS id_usuario, v.id_conductor,
              v.origen, v.destino,
              to_char(v.fecha_hora_salida, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_hora_salida,
              v.costo,
              v.cupos_disponibles, v.estado,
              concat_ws(' ', u."PrimerNombre", u."PrimerApellido") AS nombre_conductor
       FROM viaje v
       JOIN "Usuarios" u ON u."IdPersonas" = v."IdUsuario"
       WHERE v.id_viaje = $1
       FOR UPDATE OF v`,
      [idViaje],
    );
    const viaje = consultaViaje.rows[0];

    if (!viaje) {
      throw new ErrorReservaViaje("El viaje ya no está disponible.", 404);
    }
    if (
      Number(viaje.id_usuario) === idPasajero ||
      String(viaje.id_conductor) === String(idPasajero)
    ) {
      throw new ErrorReservaViaje("No puedes aceptar tu propio viaje.", 400);
    }
    if (String(viaje.estado).toLowerCase() !== "activo") {
      throw new ErrorReservaViaje("El viaje ya no está disponible.", 409);
    }
    if (Number(viaje.cupos_disponibles) < 1) {
      throw new ErrorReservaViaje("El viaje ya no tiene cupos disponibles.", 409);
    }

    const actualizacion = await cliente.query(
      `UPDATE viaje
       SET cupos_disponibles = cupos_disponibles - 1
       WHERE id_viaje = $1 AND cupos_disponibles > 0
       RETURNING cupos_disponibles`,
      [idViaje],
    );
    if (actualizacion.rowCount !== 1) {
      throw new ErrorReservaViaje("El viaje ya no tiene cupos disponibles.", 409);
    }

    const insercion = await cliente.query(
      `INSERT INTO reserva_viaje (id_viaje, id_pasajero, fecha_reserva, estado)
       VALUES (
         $1,
         $2,
         timezone('UTC', now()),
         'activa'
       )
       RETURNING id_reserva`,
      [idViaje, idPasajero],
    );

    await cliente.query("COMMIT");

    const reserva: ReservaViaje = {
      id_reserva: Number(insercion.rows[0].id_reserva),
      id_viaje: Number(viaje.id_viaje),
      id_pasajero: idPasajero,
      origen: viaje.origen,
      destino: viaje.destino,
      fecha_hora_salida: viaje.fecha_hora_salida,
      costo: Number(viaje.costo),
      id_conductor: String(viaje.id_conductor),
      nombre_conductor: String(viaje.nombre_conductor || "").trim(),
    };

    return reserva;
  } catch (error) {
    await cliente.query("ROLLBACK");
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new ErrorReservaViaje(
        "Ya tienes un viaje en curso o el viaje fue reservado.",
        409,
      );
    }
    throw error;
  } finally {
    cliente.release();
  }
}

/** Obtiene los datos del viaje activo de un pasajero. */
export async function obtenerReservaActiva(idPasajero: number) {
  const resultado = await getDbPool().query(
    `SELECT r.id_reserva, v.id_viaje, r.id_pasajero,
            v.origen, v.destino,
            to_char(v.fecha_hora_salida, 'YYYY-MM-DD"T"HH24:MI:SS') AS fecha_hora_salida,
            v.costo, v.id_conductor,
            concat_ws(' ', u."PrimerNombre", u."PrimerApellido") AS nombre_conductor
     FROM reserva_viaje r
     JOIN viaje v ON v.id_viaje = r.id_viaje
     JOIN "Usuarios" u ON u."IdPersonas" = v."IdUsuario"
     WHERE r.id_pasajero = $1 AND r.estado = 'activa'
     LIMIT 1`,
    [idPasajero],
  );

  return resultado.rows[0] ?? null;
}

/** Comprueba si el usuario ya tiene una reserva que sigue activa. */
export async function tieneReservaActiva(idPasajero: number) {
  const resultado = await getDbPool().query(
    `SELECT 1 FROM reserva_viaje
     WHERE id_pasajero = $1 AND estado = 'activa'
     LIMIT 1`,
    [idPasajero],
  );
  return resultado.rows.length > 0;
}

/**
 * Cancela la reserva activa del pasajero y devuelve el cupo al viaje.
 */
export async function cancelarReservaActiva(idPasajero: number) {
  const cliente = await getDbPool().connect();

  try {
    await cliente.query("BEGIN");
    await cliente.query("SELECT pg_advisory_xact_lock($1::bigint)", [idPasajero]);

    const consultaReserva = await cliente.query(
      `SELECT r.id_reserva, r.id_viaje, v.estado
       FROM reserva_viaje r
       JOIN viaje v ON v.id_viaje = r.id_viaje
       WHERE r.id_pasajero = $1 AND r.estado = 'activa'
       FOR UPDATE OF r, v`,
      [idPasajero],
    );
    const reserva = consultaReserva.rows[0];
    if (!reserva) {
      throw new ErrorReservaViaje("No tienes un viaje en curso para cancelar.", 404);
    }

    await cliente.query(
      `UPDATE reserva_viaje
       SET estado = 'cancelada'
       WHERE id_reserva = $1 AND estado = 'activa'`,
      [reserva.id_reserva],
    );

    if (String(reserva.estado).toLowerCase() === "activo") {
      await cliente.query(
        `UPDATE viaje
         SET cupos_disponibles = cupos_disponibles + 1
         WHERE id_viaje = $1`,
        [reserva.id_viaje],
      );
    }

    await cliente.query("COMMIT");
    return { id_viaje: Number(reserva.id_viaje) };
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}
