import { validarRegistroUsuario } from "../../../src/features/register/validations/usuarios.ts";
import { cabecerasIpCliente, getBackendApiConfig } from "../../../src/lib/backendApi.ts";

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

  const config = getBackendApiConfig();
  if (!config) {
    return Response.json(
      { error: "Falta configurar VITE_API_URL o INTERNAL_API_KEY." },
      { status: 500 },
    );
  }

  const usuario = validacion.datos;

  try {
    const headers: Record<string, string> = {
      ...config.headers,
      ...cabecerasIpCliente(request),
      "Content-Type": "application/json",
    };

    const respuesta = await fetch(`${config.baseUrl}/api/registro`, {
      method: "POST",
      headers,
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
      let mensaje = detalle;
      try {
        const cuerpo: unknown = JSON.parse(detalle);
        if (
          typeof cuerpo === "object" &&
          cuerpo !== null &&
          "error" in cuerpo &&
          typeof cuerpo.error === "string"
        ) {
          mensaje = cuerpo.error;
        }
      } catch {
        // El backend puede devolver errores de validación como texto plano.
      }

      return Response.json(
        { error: mensaje || `La API rechazó el registro (${respuesta.status}).` },
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
