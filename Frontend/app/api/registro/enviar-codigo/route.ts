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
    !cuerpo.correo.trim()
  ) {
    return Response.json({ error: "El correo es obligatorio." }, { status: 400 });
  }

  const apiUrl = process.env.VITE_API_URL;
  if (!apiUrl) {
    return Response.json({ error: "Falta configurar VITE_API_URL." }, { status: 500 });
  }

  try {
    const respuesta = await fetch(
      `${apiUrl.replace(/\/+$/, "")}/Usuarios/EnviarCodigoConfirmacion`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Correo: cuerpo.correo.trim() }),
        cache: "no-store",
      },
    );

    if (!respuesta.ok) {
      return Response.json(
        { error: "No se pudo enviar el código. Verifica el correo e inténtalo de nuevo." },
        { status: respuesta.status },
      );
    }

    return Response.json({ mensaje: "Código enviado correctamente." });
  } catch (error) {
    console.error("No se pudo conectar con la API para enviar el código:", error);
    return Response.json({ error: "No se pudo conectar con el servidor." }, { status: 502 });
  }
}
