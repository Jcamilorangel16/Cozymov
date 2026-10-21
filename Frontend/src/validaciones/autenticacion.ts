export interface CredencialesUsuario {
  correo: string;
  contrasena: string;
}

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string; estado: number };

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

function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

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
