<<<<<<< HEAD
<<<<<<< HEAD
import { validarRegistroUsuario } from "../../../src/validaciones/usuarios";

export const runtime = "nodejs";

function obtenerMensajeError(valor: unknown): string | null {
  if (typeof valor !== "object" || valor === null) return null;

  const respuesta = valor as Record<string, unknown>;
  for (const campo of ["error", "detail", "title"]) {
    if (typeof respuesta[campo] === "string" && respuesta[campo].trim()) {
      return respuesta[campo];
    }
  }

  return null;
}

=======
=======
>>>>>>> 296b0fd73352e34ac948b67c819f74204ef28a4a
// Endpoint que crea cuentas nuevas después de validar y cifrar sus datos.
import bcrypt from "bcryptjs";
import { getDbPool } from "../../../src/lib/db";
import { validarRegistroUsuario } from "../../../src/features/register/validations/usuarios";

export const runtime = "nodejs";

/**
 * Valida los datos y crea una cuenta de usuario.
 * @param request Solicitud HTTP con los datos de registro en JSON.
 * @returns Usuario creado o respuesta de error.
 */
<<<<<<< HEAD
>>>>>>> 91ffad3312f411b8b47fcbda248e7fa4a58181a1
=======
>>>>>>> 296b0fd73352e34ac948b67c819f74204ef28a4a
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "El cuerpo de la solicitud no es válido." },
      { status: 400 },
    );
  }

  const validacion = validarRegistroUsuario(body);
  if (!validacion.valido) {
    return Response.json(
      { error: validacion.error },
      { status: 400 },
    );
  }

  const datos = validacion.datos;

  try {
    const contrasenaHash = await bcrypt.hash(datos.contrasena, 12);
    await getDbPool().query(
      `INSERT INTO usuario (
         id_usuario, primer_nombre, segundo_nombre, primer_apellido,
         segundo_apellido, edad, correo, contrasena, rol, ocupacion
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        datos.idUsuario,
        datos.primerNombre,
        datos.segundoNombre,
        datos.primerApellido,
        datos.segundoApellido,
        datos.edad,
        datos.correo,
        contrasenaHash,
        "pasajero",
        datos.ocupacion,
      ],
    );

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;

    if (code === "23505") {
      return Response.json(
        { error: "Ya existe una cuenta con ese identificador o correo." },
        { status: 409 },
      );
    }

    console.error("Error al registrar usuario:", error);
    return Response.json(
      { error: "No se pudo registrar el usuario. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
