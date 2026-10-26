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

  const backendApiUrl = process.env.BACKEND_API_URL?.replace(/\/+$/, "");
  if (!backendApiUrl) {
    console.error("Falta configurar BACKEND_API_URL para el registro.");
    return Response.json(
      { error: "El servidor no está configurado para registrar usuarios." },
      { status: 500 },
    );
  }

  const datos = validacion.datos;
  const usuario = {
    PrimerNombre: datos.primerNombre,
    SegundoNombre: datos.segundoNombre ?? "",
    PrimerApellido: datos.primerApellido,
    SegundoApellido: datos.segundoApellido ?? "",
    Edad: datos.edad,
    Correo: datos.correo,
    Contrasena: datos.contrasena,
    rol: "pasajero",
    ocupacion: datos.ocupacion,
  };

  let respuestaBackend: Response;
  try {
    respuestaBackend = await fetch(`${backendApiUrl}/api/Usuarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(usuario),
      cache: "no-store",
    });
  } catch (error) {
    console.error("No se pudo contactar la API de usuarios:", error);
    return Response.json(
      {
        error:
          "No se pudo contactar el backend. Verifica que la API esté iniciada.",
      },
      { status: 502 },
    );
  }

  if (!respuestaBackend.ok) {
    const cuerpo = await respuestaBackend.text();
    let detalle: unknown;
    try {
      detalle = cuerpo ? JSON.parse(cuerpo) : null;
    } catch {
      detalle = null;
    }

    if (respuestaBackend.status >= 500) {
      console.error(
        "La API rechazó el registro con estado:",
        respuestaBackend.status,
      );
    }

    return Response.json(
      {
        error:
          obtenerMensajeError(detalle) ??
          (respuestaBackend.status >= 500
            ? "El backend tuvo un error al guardar el usuario. Revisa la conexión con la base de datos."
            : "El backend rechazó los datos del registro."),
      },
      {
        status:
          respuestaBackend.status >= 500
            ? 502
            : respuestaBackend.status,
      },
    );
  }

  await respuestaBackend.body?.cancel();
  return Response.json({ ok: true }, { status: 201 });
}