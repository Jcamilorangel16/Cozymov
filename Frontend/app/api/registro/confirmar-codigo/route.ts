export const runtime = "nodejs";

export async function POST(request: Request) {
  let cuerpo: unknown;

  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "El cuerpo de la solicitud no es válido." }, { status: 400 });
  }

  if (
    typeof cuerpo !== "object" ||
    cuerpo === null ||
    !("correo" in cuerpo) ||
    typeof cuerpo.correo !== "string" ||
    !cuerpo.correo.trim() ||
    !("codigo" in cuerpo) ||
    typeof cuerpo.codigo !== "string" ||
    !/^\d{6}$/.test(cuerpo.codigo.trim())
  ) {
    return Response.json(
      { error: "Ingresa el correo y un código de 6 dígitos." },
      { status: 400 },
    );
  }

  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    return Response.json({ error: "Falta configurar VITE_API_URL." }, { status: 500 });
  }

  try {
    const respuesta = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/Usuarios/ConfirmarCodigo`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Correo: cuerpo.correo.trim(),
          Codigo: cuerpo.codigo.trim(),
        }),
        cache: "no-store",
      },
    );

    if (!respuesta.ok) {
      return Response.json(
        { error: "El código es incorrecto o expiró. Inténtalo de nuevo o solicita otro." },
        { status: respuesta.status },
      );
    }

    return Response.json({ mensaje: "Correo confirmado correctamente." });
  } catch (error) {
    console.error("No se pudo conectar con la API para confirmar el código:", error);
    return Response.json({ error: "No se pudo conectar con el servidor." }, { status: 502 });
  }
}
