// Aplica validaciones y coordina las operaciones del dominio de viajes.
import {
  insertarViaje,
  listarViajesActivos,
  obtenerViajeActivoPorUsuario,
} from "../repositories/viajeRepository";
import {
  validarDatosNuevoViaje,
  validarFiltrosViajes,
  validarIdUsuarioViaje,
} from "../validations/viajes";

/**
 * Valida los datos y publica un viaje mediante el repositorio.
 * @param body Cuerpo recibido desde la API.
 * @returns Estado de validación y resultado de publicación.
 */
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

/**
 * Valida filtros y consulta viajes activos o el viaje de un usuario.
 * @param searchParams Parámetros de búsqueda de la solicitud.
 * @returns Estado de validación y resultado de consulta.
 */
export async function consultarViajes(searchParams: URLSearchParams) {
  const validacionUsuario = validarIdUsuarioViaje(
    searchParams.get("id_usuario"),
  );
  if (!validacionUsuario.valido) {
    return {
      valido: false as const,
      estado: 400,
      error: validacionUsuario.error,
    };
  }

  const idUsuario = validacionUsuario.datos;
  if (idUsuario) {
    const viaje = await obtenerViajeActivoPorUsuario(idUsuario);
    return { valido: true as const, resultado: { viaje } };
  }

  const validacion = validarFiltrosViajes(searchParams);
  if (!validacion.valido) {
    return { valido: false as const, estado: 400, error: validacion.error };
  }

  const viajes = await listarViajesActivos(validacion.datos);
  return { valido: true as const, resultado: { viajes } };
}
