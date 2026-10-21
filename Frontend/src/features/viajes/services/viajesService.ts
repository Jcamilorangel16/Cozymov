import {
  insertarViaje,
  listarViajesActivos,
  obtenerViajeActivoPorUsuario,
} from "../repositories/viajeRepository";
import {
  validarDatosNuevoViaje,
  validarFiltrosViajes,
} from "../validations/viajeValidation";

export async function publicarViaje(body: unknown) {
  const validacion = validarDatosNuevoViaje(body);
  if (!validacion.valido) {
    return { valido: false as const, estado: 400, error: validacion.error };
  }

  try {
    const viaje = await insertarViaje(validacion.datos);
    return { valido: true as const, viaje };
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? error.code
        : undefined;

    if (code === "23503") {
      return {
        valido: false as const,
        estado: 400,
        error: "El usuario o vehículo especificado no existe en la base de datos.",
      };
    }

    throw error;
  }
}

export async function consultarViajes(searchParams: URLSearchParams) {
  const idUsuario = searchParams.get("id_usuario");
  if (idUsuario) {
    const viaje = await obtenerViajeActivoPorUsuario(idUsuario.trim());
    return { valido: true as const, resultado: { viaje } };
  }

  const validacion = validarFiltrosViajes(searchParams);
  if (!validacion.valido) {
    return { valido: false as const, estado: 400, error: validacion.error };
  }

  const viajes = await listarViajesActivos(validacion.datos);
  return { valido: true as const, resultado: { viajes } };
}
