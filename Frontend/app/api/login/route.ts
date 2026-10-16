import bcrypt from "bcryptjs";
import { getDbPool } from "../../../src/lib/db";

export const runtime = "nodejs";

type Credenciales = {
  correo?: unknown;
  contrasena?: unknown;
};

type UsuarioLogin = {
  id: string;
  primer_nombre: string;
  segundo_nombre: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
  correo: string;
  contrasena: string;
};

export async function POST(request: Request) {
  let datos: Credenciales;

  try {
    datos = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (typeof datos.correo !== "string" || typeof datos.contrasena !== "string") {
    return Response.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
  }

  const correo = datos.correo.trim().toLowerCase();
  const contrasena = datos.contrasena;

  if (!correo || !contrasena) {
    return Response.json({ error: "Ingresa tu correo y contraseña." }, { status: 400 });
  }

  if (Buffer.byteLength(contrasena, "utf8") > 72) {
    return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  try {
    const resultado = await getDbPool().query<UsuarioLogin>(
      `SELECT id_usuario AS id, primer_nombre, segundo_nombre,
         primer_apellido, segundo_apellido, correo, contrasena
       FROM usuario
       WHERE lower(correo) = $1
       LIMIT 1`,
      [correo]
    );
    const usuario = resultado.rows[0];

    if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena))) {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    return Response.json({
      usuario: {
        id: usuario.id,
        nombres: [usuario.primer_nombre, usuario.segundo_nombre].filter(Boolean).join(" "),
        apellidos: [usuario.primer_apellido, usuario.segundo_apellido].filter(Boolean).join(" "),
        correo: usuario.correo,
      },
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return Response.json({ error: "No se pudo iniciar sesión. Inténtalo de nuevo." }, { status: 500 });
  }
}