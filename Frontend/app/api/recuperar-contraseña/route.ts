import bcrypt from "bcryptjs";
import { getDbPool } from "../../../src/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accion, correo, codigo, nuevaContrasena } = body;

    if (!accion) {
      return Response.json({ error: "Acción no especificada." }, { status: 400 });
    }

    // =========================================================================
    // FASE 1: Solicitar código de recuperación
    // =========================================================================

    if (accion === "solicitar") {
      if (typeof correo !== "string" || !correo.trim().endsWith(".edu.co")) {
        return Response.json(
          { error: "Debe ingresar un correo institucional válido (.edu.co)." },
          { status: 400 }
        );
      }

      const correoLimpio = correo.trim().toLowerCase();

      // Verificar si el usuario existe en la base de datos
      const resultado = await getDbPool().query(
        `SELECT id_usuario AS id, correo FROM usuario WHERE lower(correo) = $1 LIMIT 1`,
        [correoLimpio]
      );

      if (resultado.rows.length === 0) {
        return Response.json(
          { error: "El correo no se encuentra registrado en el sistema." },
          { status: 404 }
        );
      }

      // Generar código de 6 dígitos y calcular expiración (5 minutos)
      const codigoGenerado = Math.floor(100000 + Math.random() * 900000).toString();
      const expiracion = new Date(Date.now() + 5 * 60 * 1000);

      // Guardar el código y su expiración en la tabla de usuario
      
      await getDbPool().query(
        `UPDATE usuario SET codigo_recuperacion = $1, codigo_expiracion = $2 WHERE lower(correo) = $3`,
        [codigoGenerado, expiracion.toISOString(), correoLimpio]
      );

      // TODO: Aquí enviarías el correo con el código (ej. usando Nodemailer o Resend)

      return Response.json(
        { mensaje: "Código de recuperación enviado con éxito." },
        { status: 200 }
      );
    }

    // =========================================================================
    // FASE 2: Validar código y actualizar contraseña (RF-AUT-003)
    // =========================================================================

    
    if (accion === "restablecer") {
      if (!correo || !codigo || !nuevaContrasena) {
        return Response.json(
          { error: "Todos los campos son obligatorios." },
          { status: 400 }
        );
      }

      const correoLimpio = correo.trim().toLowerCase();

      
      const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
      if (!regexPassword.test(nuevaContrasena)) {
        return Response.json(
          { 
            error: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial." 
          },
          { status: 400 }
        );
      }

      
      const resultado = await getDbPool().query(
        `SELECT id_usuario AS id, codigo_recuperacion, codigo_expiracion FROM usuario WHERE lower(correo) = $1 LIMIT 1`,
        [correoLimpio]
      );

      if (resultado.rows.length === 0) {
        return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
      }

      const usuario = resultado.rows[0];

      // Validar coincidencia del código
      if (usuario.codigo_recuperacion !== codigo) {
        return Response.json({ error: "El código de verificación es incorrecto." }, { status: 400 });
      }

      // Validar vigencia del código (5 minutos)
      if (new Date() > new Date(usuario.codigo_expiracion)) {
        return Response.json({ error: "El código de verificación ha expirado." }, { status: 400 });
      }

      
      const hashedPassword = await bcrypt.hash(nuevaContrasena, 10);

      
      await getDbPool().query(
        `UPDATE usuario SET contrasena = $1, codigo_recuperacion = NULL, codigo_expiracion = NULL WHERE lower(correo) = $2`,
        [hashedPassword, correoLimpio]
      );

      return Response.json(
        { mensaje: "Contraseña actualizada correctamente." },
        { status: 200 }
      );
    }

    return Response.json({ error: "Acción no válida." }, { status: 400 });

  } catch (error) {
    console.error("Error en el endpoint de recuperación:", error);
    return Response.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}