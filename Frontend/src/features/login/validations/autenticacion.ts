// Valida credenciales de acceso y datos mínimos de sesión.
import type { CredencialesUsuario } from "../types/autenticacion";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string; estado: number };

/**
 * Comprueba que el token entregue identificador y correo en formato de texto.
 * @param id Identificador decodificado del usuario.
 * @param correo Correo decodificado del usuario.
 * @returns Resultado con los datos de sesión validados.
 */
export function validarDatosSesion(
  id: unknown,
  correo: unknown,
):
  | { valido: true; datos: { id: string; correo: string } }
  | { valido: false } {
  if (typeof id !== "string" || typeof correo !== "string") {
    return { valido: false };
  }
  return { valido: true, datos: { id, correo } };
}

/**
 * Comprueba que el valor sea un objeto JSON no nulo ni una lista.
 * @param valor Valor desconocido que se va a revisar.
 * @returns Si el valor puede tratarse como un registro.
 */
function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Valida y normaliza las credenciales recibidas por la API de login.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Credenciales normalizadas o error con estado HTTP.
 */
export function validarCredencialesUsuario(
  valor: unknown,
): ResultadoValidacion<CredencialesUsuario> {
  if (!esRegistro(valor)) {
    return {
      valido: false,
      error: "Ingresa tu correo y contraseña.",
      estado: 400,
    };
  }

  if (typeof valor.correo !== "string" || typeof valor.contrasena !== "string") {
    return {
      valido: false,
      error: "Ingresa tu correo y contraseña.",
      estado: 400,
    };
  }

  const correo = valor.correo.trim().toLowerCase();
  const contrasena = valor.contrasena;
  if (!correo || !contrasena) {
    return {
      valido: false,
      error: "Ingresa tu correo y contraseña.",
      estado: 400,
    };
  }

  if (Buffer.byteLength(contrasena, "utf8") > 72) {
    return {
      valido: false,
      error: "Correo o contraseña incorrectos.",
      estado: 401,
    };
  }

  return { valido: true, datos: { correo, contrasena } };
}
