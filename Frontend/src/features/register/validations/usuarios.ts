// Define los datos y las reglas de validación de las cuentas de usuario.
import type { DatosRegistroUsuario } from "../types/usuarios";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

/**
 * Comprueba que el valor sea un objeto JSON no nulo ni una lista.
 * @param valor Valor que se va a revisar.
 * @returns Si el valor puede tratarse como un registro.
 */
function esRegistro(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

/**
 * Comprueba que el valor sea texto con contenido después de recortarlo.
 * @param valor Valor desconocido que se valida.
 * @returns Si el valor es una cadena no vacía.
 */
function esTextoNoVacio(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim().length > 0;
}

/**
 * Valida y normaliza los datos que se guardan para una cuenta de usuario.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Datos de cuenta normalizados o error de validación.
 */
export function validarRegistroUsuario(
  valor: unknown,
): ResultadoValidacion<DatosRegistroUsuario> {
  if (!esRegistro(valor)) {
    return { valido: false, error: "Completa todos los campos." };
  }

  const {
    idUsuario,
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    edad,
    correo,
    contrasena,
    ocupacion,
  } = valor;

  if (
    !esTextoNoVacio(idUsuario) ||
    !esTextoNoVacio(primerNombre) ||
    !esTextoNoVacio(primerApellido) ||
    !esTextoNoVacio(correo) ||
    !esTextoNoVacio(ocupacion) ||
    typeof contrasena !== "string"
  ) {
    return { valido: false, error: "Completa todos los campos." };
  }

  if (
    (segundoNombre !== undefined && segundoNombre !== null && typeof segundoNombre !== "string") ||
    (segundoApellido !== undefined && segundoApellido !== null && typeof segundoApellido !== "string")
  ) {
    return { valido: false, error: "Los nombres y apellidos no son válidos." };
  }

  const usuarioId = idUsuario.trim();
  const nombre = primerNombre.trim();
  const segundoNombreNormalizado =
    typeof segundoNombre === "string" ? segundoNombre.trim() || null : null;
  const apellido = primerApellido.trim();
  const segundoApellidoNormalizado =
    typeof segundoApellido === "string" ? segundoApellido.trim() || null : null;
  const correoNormalizado = correo.trim().toLowerCase();
  const ocupacionNormalizada = ocupacion.trim();

  if (
    usuarioId.length > 20 ||
    nombre.length > 50 ||
    (segundoNombreNormalizado !== null && segundoNombreNormalizado.length > 50) ||
    apellido.length > 50 ||
    (segundoApellidoNormalizado !== null && segundoApellidoNormalizado.length > 50) ||
    correoNormalizado.length > 150 ||
    ocupacionNormalizada.length > 50
  ) {
    return {
      valido: false,
      error: "Uno o más campos superan la longitud permitida.",
    };
  }

  if (
    typeof edad !== "number" ||
    !Number.isInteger(edad) ||
    edad < 16 ||
    edad > 32767
  ) {
    return {
      valido: false,
      error: "La edad debe ser un número entero de al menos 16 años.",
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.edu\.co$/i.test(correoNormalizado)) {
    return {
      valido: false,
      error: "El correo debe ser institucional y terminar en .edu.co.",
    };
  }

  if (contrasena.length < 8 || new TextEncoder().encode(contrasena).length > 72) {
    return {
      valido: false,
      error: "La contraseña debe tener entre 8 y 72 bytes.",
    };
  }

  return {
    valido: true,
    datos: {
      idUsuario: usuarioId,
      primerNombre: nombre,
      segundoNombre: segundoNombreNormalizado,
      primerApellido: apellido,
      segundoApellido: segundoApellidoNormalizado,
      edad,
      correo: correoNormalizado,
      contrasena,
      ocupacion: ocupacionNormalizada,
    },
  };
}

/**
 * Comprueba los campos del formulario y que ambas contraseñas coincidan.
 * @param valor Datos capturados por el formulario.
 * @param confirmarContrasena Contraseña de confirmación ingresada.
 * @returns Datos de registro validados o error para mostrar.
 */
export function validarFormularioRegistro(
  valor: unknown,
  confirmarContrasena: string,
): ResultadoValidacion<DatosRegistroUsuario> {
  if (!esRegistro(valor)) {
    return { valido: false, error: "Por favor, completa todos los campos." };
  }
  const camposObligatorios = [
    "primerNombre",
    "primerApellido",
    "idUsuario",
    "edad",
    "correo",
    "contrasena",
    "ocupacion",
  ];
  if (
    camposObligatorios.some((campo) => {
      const contenido = valor[campo];
      return typeof contenido !== "string" || !contenido.trim();
    }) ||
    confirmarContrasena === ""
  ) {
    return { valido: false, error: "Por favor, completa todos los campos." };
  }

  if (valor.contrasena !== confirmarContrasena) {
    return { valido: false, error: "Las contraseñas no coinciden." };
  }

  return validarRegistroUsuario({
    ...valor,
    edad: Number(valor.edad),
  });
}
