import { validarRegistroUsuario } from "../../../src/features/register/validations/usuarios";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo no es un JSON válido." }, { status: 400 });
  }

  const validacion = validarRegistroUsuario(body);
  if (!validacion.valido) {
    return Response.json({ error: validacion.error }, { status: 400 });
  }

  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    return Response.json({ error: "Falta configurar VITE_API_URL." }, { status: 500 });
  }

  const usuario = validacion.datos;

  try {
    const respuesta = await fetch(`${apiUrl.replace(/\/$/, "")}/Usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Cedula: usuario.idUsuario,
        PrimerNombre: usuario.primerNombre,
        SegundoNombre: usuario.segundoNombre ?? "",
        PrimerApellido: usuario.primerApellido,
        SegundoApellido: usuario.segundoApellido ?? "",
        Edad: usuario.edad,
        Correo: usuario.correo,
        Contrasena: usuario.contrasena,
        rol: "usuario",
        ocupacion: usuario.ocupacion,
      }),
      cache: "no-store",
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      return Response.json(
        { error: detalle || `La API rechazó el registro (${respuesta.status}).` },
        { status: respuesta.status },
      );
    }

    // No reenviar al navegador la respuesta del backend, que incluye la contraseña.
    return Response.json({ mensaje: "Registro exitoso." }, { status: 201 });
  } catch (error) {
    console.error("No se pudo conectar con la API de registro:", error);
    return Response.json({ error: "No se pudo conectar con la API." }, { status: 502 });
  }
}