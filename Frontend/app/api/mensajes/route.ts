import { NextResponse } from "next/server";
import { getDbPool } from "../../../src/lib/db";


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usuario1 = searchParams.get("usuario1");
  const usuario2 = searchParams.get("usuario2");

  try {
    const pool = getDbPool();
    const result = await pool.query(
      `SELECT id_mensaje, id_emisor, id_receptor, contenido, fecha_hora, leido 
       FROM MENSAJE 
       WHERE (id_emisor = $1 AND id_receptor = $2) 
          OR (id_emisor = $2 AND id_receptor = $1)
       ORDER BY fecha_hora ASC`,
      [usuario1, usuario2]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    return NextResponse.json({ error: "Error al obtener mensajes" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const { id_emisor, id_receptor, contenido } = await request.json();
    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO MENSAJE (id_emisor, id_receptor, contenido)
       VALUES ($1, $2, $3)
       RETURNING id_mensaje, id_emisor, id_receptor, contenido, fecha_hora, leido`,
      [id_emisor, id_receptor, contenido]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error al guardar mensaje:", error);
    return NextResponse.json({ error: "Error al guardar el mensaje" }, { status: 500 });
  }
}