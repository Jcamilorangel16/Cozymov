import bcrypt from "bcryptjs";
import { getDbPool } from "../../../src/lib/db";

export const runtime = "nodejs";

type Registro = {
  nombre?: unknown;
  apellido?: unknown;
  documento?: unknown;
  numero?: unknown;
  correo?: unknown;
  contrasena?: unknown;
}; 

function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

export async function POST(request: Request) {
  let datos: Registro;

  try {
    datos = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (
    !esTextoNoVacio(datos.nombre) ||
    !esTextoNoVacio(datos.apellido) ||
    !esTextoNoVacio(datos.documento) ||
    !esTextoNoVacio(datos.numero) ||
    !esTextoNoVacio(datos.correo) ||
    typeof datos.contrasena !== "string"
  ) {
    return Response.json({ error: "Completa todos los campos." }, { status: 400 });
  }

  const nombre = datos.nombre.trim();
  const apellido = datos.apellido.trim();
  const documento = datos.documento.trim();
  const numero = datos.numero.trim();
  const correo = datos.correo.trim().toLowerCase();
  const contrasena = datos.contrasena;

  if (!/^[^\s@]+@[^\s@]+\.edu\.co$/i.test(correo)) {
    return Response.json({ error: "El correo debe ser institucional y terminar en .edu.co." }, { status: 400 });
  }

  if (contrasena.length < 8 || Buffer.byteLength(contrasena, "utf8") > 72) {
    return Response.json({ error: "La contraseña debe tener entre 8 y 72 bytes." }, { status: 400 });
  }

  try {
    const contrasenaHash = await bcrypt.hash(contrasena, 12);
    const resultado = await getDbPool().query(
      `INSERT INTO usuarios (nombres, apellidos, documento, telefono, correo, contrasena)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombres AS nombre, apellidos AS apellido, correo`,
      [nombre, apellido, documento, numero, correo, contrasenaHash]
    );

    return Response.json({ usuario: resultado.rows[0] }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Ya existe una cuenta con ese correo o documento." }, { status: 409 });
    }

    console.error("Error al registrar usuario:", error);
    return Response.json({ error: "No se pudo crear la cuenta. Inténtalo de nuevo." }, { status: 500 });
  }
}