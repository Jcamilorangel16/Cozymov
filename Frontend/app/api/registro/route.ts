import bcrypt from "bcryptjs";
import { getDbPool } from "../../../src/lib/db";

export const runtime = "nodejs";

type Registro = {
  idUsuario?: unknown;
  primerNombre?: unknown;
  segundoNombre?: unknown;
  primerApellido?: unknown;
  segundoApellido?: unknown;
  edad?: unknown;
  correo?: unknown;
  contrasena?: unknown;
  ocupacion?: unknown;
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
    !esTextoNoVacio(datos.idUsuario) ||
    !esTextoNoVacio(datos.primerNombre) ||
    !esTextoNoVacio(datos.primerApellido) ||
    !esTextoNoVacio(datos.correo) ||
    !esTextoNoVacio(datos.ocupacion) ||
    typeof datos.contrasena !== "string"
  ) {
    return Response.json({ error: "Completa todos los campos." }, { status: 400 });
  }

  if (
    (datos.segundoNombre !== undefined && datos.segundoNombre !== null && typeof datos.segundoNombre !== "string") ||
    (datos.segundoApellido !== undefined && datos.segundoApellido !== null && typeof datos.segundoApellido !== "string")
  ) {
    return Response.json({ error: "Los nombres y apellidos no son válidos." }, { status: 400 });
  }

  const idUsuario = datos.idUsuario.trim();
  const primerNombre = datos.primerNombre.trim();
  const segundoNombre = typeof datos.segundoNombre === "string" ? datos.segundoNombre.trim() || null : null;
  const primerApellido = datos.primerApellido.trim();
  const segundoApellido = typeof datos.segundoApellido === "string" ? datos.segundoApellido.trim() || null : null;
  const ocupacion = datos.ocupacion.trim();
  const correo = datos.correo.trim().toLowerCase();
  const contrasena = datos.contrasena;

  if (
    idUsuario.length > 20 ||
    primerNombre.length > 50 ||
    (segundoNombre !== null && segundoNombre.length > 50) ||
    primerApellido.length > 50 ||
    (segundoApellido !== null && segundoApellido.length > 50) ||
    correo.length > 150 ||
    ocupacion.length > 50
  ) {
    return Response.json({ error: "Uno o más campos superan la longitud permitida." }, { status: 400 });
  }

  if (
    typeof datos.edad !== "number" ||
    !Number.isInteger(datos.edad) ||
    datos.edad < 16 ||
    datos.edad > 32767
  ) {
    return Response.json({ error: "La edad debe ser un número entero de al menos 16 años." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.edu\.co$/i.test(correo)) {
    return Response.json({ error: "El correo debe ser institucional y terminar en .edu.co." }, { status: 400 });
  }

  if (contrasena.length < 8 || Buffer.byteLength(contrasena, "utf8") > 72) {
    return Response.json({ error: "La contraseña debe tener entre 8 y 72 bytes." }, { status: 400 });
  }

  try {
    const contrasenaHash = await bcrypt.hash(contrasena, 12);
    const resultado = await getDbPool().query(
      `INSERT INTO usuario (
         id_usuario, primer_nombre, segundo_nombre, primer_apellido,
         segundo_apellido, edad, correo, contrasena, rol, ocupacion
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id_usuario, primer_nombre, segundo_nombre,
         primer_apellido, segundo_apellido, correo`,
      [
        idUsuario,
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        datos.edad,
        correo,
        contrasenaHash,
        "pasajero",
        ocupacion,
      ]
    );

    const usuario = resultado.rows[0];
    return Response.json({
      usuario: {
        id: usuario.id_usuario,
        nombres: [usuario.primer_nombre, usuario.segundo_nombre].filter(Boolean).join(" "),
        apellidos: [usuario.primer_apellido, usuario.segundo_apellido].filter(Boolean).join(" "),
        correo: usuario.correo,
      },
    }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return Response.json({ error: "Ya existe una cuenta con ese correo o identificador." }, { status: 409 });
    }

    console.error("Error al registrar usuario:", error);
    return Response.json({ error: "No se pudo crear la cuenta. Inténtalo de nuevo." }, { status: 500 });
  }
}