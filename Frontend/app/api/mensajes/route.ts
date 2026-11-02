// Endpoints para consultar conversaciones y guardar mensajes.
import { NextResponse } from "next/server";
import { getDbPool } from "../../../src/lib/db";
import {
  validarDatosMensaje,
  validarParticipantesMensaje,
} from "../../../src/features/mensajes/validations/mensajes";

/**
 * Consulta los mensajes entre dos usuarios.
 * @param request Solicitud con los identificadores en la query.
 * @returns Lista de mensajes o respuesta de error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuario1 = searchParams.get("usuario1");
  const usuario2 = searchParams.get("usuario2");
  const validacion = validarParticipantesMensaje(usuario1, usuario2);
  if (!validacion.valido) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  try {
    const pool = getDbPool();
    const result = await pool.query(
      `SELECT id_mensaje, id_emisor, id_receptor, contenido, fecha_hora, leido 
       FROM MENSAJE 
       WHERE (id_emisor = $1 AND id_receptor = $2) 
          OR (id_emisor = $2 AND id_receptor = $1)
       ORDER BY fecha_hora ASC`,
      [validacion.datos.usuario1, validacion.datos.usuario2]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }
}


/**
 * Valida y guarda un mensaje recibido en el cuerpo JSON.
 * @param request Solicitud con emisor, receptor y contenido.
 * @returns Mensaje guardado o respuesta de error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Los datos del mensaje no son válidos." },
      { status: 400 },
    );
  }

  const validacion = validarDatosMensaje(body);
  if (!validacion.valido) {
    return NextResponse.json({ error: validacion.error }, { status: 400 });
  }

  try {
    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO MENSAJE (id_emisor, id_receptor, contenido)
       VALUES ($1, $2, $3)
       RETURNING id_mensaje, id_emisor, id_receptor, contenido, fecha_hora, leido`,
      [
        validacion.datos.id_emisor,
        validacion.datos.id_receptor,
        validacion.datos.contenido,
      ]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error al guardar mensaje:", error);
    return NextResponse.json({ error: "Error al guardar el mensaje" }, { status: 500 });
  }
}