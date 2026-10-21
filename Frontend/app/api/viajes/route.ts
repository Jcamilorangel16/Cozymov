import { NextResponse } from "next/server";
import { getDbPool } from "../../../src/lib/db";

export const runtime = "nodejs";

// Comprueba que el valor sea texto con contenido, ignorando espacios al validar.
function esTextoValido(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

/**
 * Publica un viaje activo en PostgreSQL.
 *
 * Espera un objeto JSON con `id_usuario`, `id_vehiculo`, `origen`, `destino`,
 * `punto_encuentro`, `precio_pasaje`, `cupos_disponibles`, `fecha_salida` y
 * `hora_salida`; `informacion_adicional` es opcional. Valida los datos antes
 * de insertar y responde con HTTP 201 y `{ viaje }`, o con `{ error }` y un
 * estado HTTP 400/500. No comprueba una sesión autenticada: los identificadores
 * recibidos no demuestran por sí mismos que quien llama sea ese usuario.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  // Un cuerpo que no se pueda interpretar como JSON es una solicitud inválida.
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un JSON válido." },
      { status: 400 }
    );
  }

  // Valida los identificadores y los campos obligatorios del recorrido.
  const {
    id_usuario,
    id_vehiculo,
    origen,
    destino,
    punto_encuentro,
    precio_pasaje,
    cupos_disponibles,
    fecha_salida,
    hora_salida,
    informacion_adicional,
  } = body;

  if (!esTextoValido(id_usuario) || id_usuario.length > 20) {
    return NextResponse.json(
      { error: "id_usuario es obligatorio y debe tener máximo 20 caracteres." },
      { status: 400 }
    );
  }

  const idVehiculo = Number(id_vehiculo);
  if (!Number.isInteger(idVehiculo) || idVehiculo <= 0) {
    return NextResponse.json(
      { error: "id_vehiculo debe ser un identificador válido." },
      { status: 400 }
    );
  }

  if (!esTextoValido(origen) || !esTextoValido(destino)) {
    return NextResponse.json(
      { error: "El origen y el destino son obligatorios." },
      { status: 400 }
    );
  }

  if (origen.trim().toLowerCase() === destino.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "El origen y el destino deben ser diferentes." },
      { status: 400 }
    );
  }

  if (!esTextoValido(punto_encuentro)) {
    return NextResponse.json(
      { error: "El punto de encuentro es obligatorio." },
      { status: 400 }
    );
  }

  // Los valores recibidos se convierten a números y se limitan a los rangos admitidos.
  const precio = Number(precio_pasaje);
  if (!Number.isSafeInteger(precio) || precio <= 0) {
    return NextResponse.json(
      { error: "El precio del pasaje debe ser un número entero mayor a 0 pesos." },
      { status: 400 }
    );
  }

  const cupos = Number(cupos_disponibles);
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > 7) {
    return NextResponse.json(
      { error: "Los cupos disponibles deben estar entre 1 y 7." },
      { status: 400 }
    );
  }

  if (!esTextoValido(fecha_salida) || !esTextoValido(hora_salida)) {
    return NextResponse.json(
      { error: "La fecha y la hora de salida son obligatorias." },
      { status: 400 }
    );
  }

  // Interpreta la fecha y hora local recibidas y evita publicar salidas pasadas.
  const salida = new Date(`${fecha_salida}T${hora_salida}`);
  const ahora = new Date();
  ahora.setSeconds(0, 0);
  if (Number.isNaN(salida.getTime()) || salida < ahora) {
    return NextResponse.json(
      { error: "La fecha y hora de salida no pueden estar en el pasado." },
      { status: 400 }
    );
  }

  // La información adicional es opcional; se almacena como NULL si viene vacía.
  const infoAdicional =
    typeof informacion_adicional === "string" && informacion_adicional.trim()
      ? informacion_adicional.trim()
      : null;

  if (infoAdicional && infoAdicional.length > 500) {
    return NextResponse.json(
      { error: "La información adicional no puede superar los 500 caracteres." },
      { status: 400 }
    );
  }

  try {
    const pool = getDbPool();
    // Usa parámetros SQL para no concatenar directamente los datos del usuario.
    const resultado = await pool.query(
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
        id_usuario.trim(),
        idVehiculo,
        origen.trim(),
        destino.trim(),
        punto_encuentro.trim(),
        precio,
        cupos,
        fecha_salida.trim(),
        hora_salida.trim(),
        infoAdicional,
      ]
    );

    return NextResponse.json({ viaje: resultado.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar viaje en base de datos:", error);
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;

    // PostgreSQL usa 23503 cuando una clave foránea apunta a un usuario o vehículo inexistente.
    if (code === "23503") {
      return NextResponse.json(
        { error: "El usuario o vehículo especificado no existe en la base de datos." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "No se pudo registrar el viaje en la base de datos." },
      { status: 500 }
    );
  }
}

/**
 * Consulta viajes activos.
 *
 * Con `id_usuario`, devuelve el viaje activo más reciente de ese usuario (o
 * `null` si no tiene uno). Sin ese parámetro, devuelve todos los viajes activos
 * junto con el nombre y apellido del conductor, ordenados por fecha y hora.
 * Responde con `{ viaje }` en el primer caso y `{ viajes }` en el segundo.
 * La ruta no exige una sesión autenticada.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const idUsuario = searchParams.get("id_usuario");

  try {
    const pool = getDbPool();

    if (idUsuario) {
      // Esta consulta es para restaurar el último viaje activo de un usuario.
      const resultado = await pool.query(
        `SELECT * FROM viaje
         WHERE id_usuario = $1 AND estado = 'activo'
         ORDER BY id_viaje DESC
         LIMIT 1`,
        [idUsuario.trim()]
      );
      return NextResponse.json({ viaje: resultado.rows[0] ?? null });
    }

    // Sin filtro de usuario, entrega el listado activo para mostrarlo en la aplicación.
    const resultado = await pool.query(
      `SELECT v.*, u.primer_nombre, u.primer_apellido
       FROM viaje v
       JOIN usuario u ON v.id_usuario = u.id_usuario
       WHERE v.estado = 'activo'
       ORDER BY v.fecha_salida ASC, v.hora_salida ASC`
    );

    return NextResponse.json({ viajes: resultado.rows });
  } catch (error) {
    console.error("Error al consultar viajes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los viajes." },
      { status: 500 }
    );
  }
}
