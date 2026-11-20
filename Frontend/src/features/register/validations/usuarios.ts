// Define los datos y las reglas de validación de las cuentas de usuario.
import type {
  DatosPersonalesRegistro,
  DatosRegistroGoogle,
  DatosRegistroUsuario,
} from "../types/usuarios";

type ResultadoValidacion<T> =
  | { valido: true; datos: T }
  | { valido: false; error: string };

// En desarrollo se acepta cualquier correo para poder probar el flujo completo.
// En producción solo se permiten correos institucionales .edu.co.
const ES_DESARROLLO = process.env.NODE_ENV !== "production";
const EXPRESION_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const EXPRESION_CORREO_INSTITUCIONAL = /^[^\s@]+@[^\s@]+\.edu\.co$/i;
const ERROR_INCOMPLETO = "Completa todos los campos.";
const ERROR_LONGITUD = "Uno o más campos superan la longitud permitida.";

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
 * Comprueba la política de contraseñas: entre 8 caracteres y 72 bytes (límite de bcrypt).
 * @param contrasena Contraseña ingresada.
 * @returns Mensaje de error o null si es válida.
 */
function errorContrasena(contrasena: string): string | null {
  return contrasena.length < 8 || new TextEncoder().encode(contrasena).length > 72
    ? "La contraseña debe tener entre 8 y 72 bytes."
    : null;
}

/**
 * Valida y normaliza cédula, nombres, edad y ocupación.
 * @param valor Cuerpo ya comprobado como objeto.
 * @returns Datos personales normalizados o error de validación.
 */
function validarDatosPersonales(
  valor: Record<string, unknown>,
): ResultadoValidacion<DatosPersonalesRegistro> {
  const {
    idUsuario,
    primerNombre,
    segundoNombre,
    primerApellido,
    segundoApellido,
    edad,
    ocupacion,
  } = valor;

  if (
    !esTextoNoVacio(idUsuario) ||
    !esTextoNoVacio(primerNombre) ||
    !esTextoNoVacio(primerApellido) ||
    !esTextoNoVacio(ocupacion)
  ) {
    return { valido: false, error: ERROR_INCOMPLETO };
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
  const ocupacionNormalizada = ocupacion.trim();

  if (!/^\d{1,10}$/.test(usuarioId)) {
    return {
      valido: false,
      error: "La cédula debe contener solo números y máximo 10 dígitos.",
    };
  }

  if (
    nombre.length > 50 ||
    (segundoNombreNormalizado !== null && segundoNombreNormalizado.length > 50) ||
    apellido.length > 50 ||
    (segundoApellidoNormalizado !== null && segundoApellidoNormalizado.length > 50) ||
    ocupacionNormalizada.length > 50
  ) {
    return { valido: false, error: ERROR_LONGITUD };
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

  return {
    valido: true,
    datos: {
      idUsuario: usuarioId,
      primerNombre: nombre,
      segundoNombre: segundoNombreNormalizado,
      primerApellido: apellido,
      segundoApellido: segundoApellidoNormalizado,
      edad,
      ocupacion: ocupacionNormalizada,
    },
  };
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
    return { valido: false, error: ERROR_INCOMPLETO };
  }

  const { correo, contrasena } = valor;
  if (!esTextoNoVacio(correo) || typeof contrasena !== "string") {
    return { valido: false, error: ERROR_INCOMPLETO };
  }

  const personales = validarDatosPersonales(valor);
  if (!personales.valido) {
    return personales;
  }

  const correoNormalizado = correo.replace(/\s+/g, "").toLowerCase();
  if (correoNormalizado.length > 150) {
    return { valido: false, error: ERROR_LONGITUD };
  }

  const expresionCorreo = ES_DESARROLLO
    ? EXPRESION_CORREO
    : EXPRESION_CORREO_INSTITUCIONAL;
  if (!expresionCorreo.test(correoNormalizado)) {
    return {
      valido: false,
      error: ES_DESARROLLO
        ? "Ingresa un correo electrónico válido."
        : "El correo debe ser institucional y terminar en .edu.co.",
    };
  }

  const errorClave = errorContrasena(contrasena);
  if (errorClave) {
    return { valido: false, error: errorClave };
  }

  return {
    valido: true,
    datos: { ...personales.datos, correo: correoNormalizado, contrasena },
  };
}

/**
 * Valida los datos que completa el usuario al registrarse con Google, incluida
 * la contraseña obligatoria. El correo no se acepta del cliente: lo aporta la
 * identidad firmada de Google.
 * @param valor Cuerpo desconocido de la solicitud.
 * @returns Datos normalizados (sin correo) o error de validación.
 */
export function validarRegistroGoogle(
  valor: unknown,
): ResultadoValidacion<DatosRegistroGoogle> {
  if (!esRegistro(valor)) {
    return { valido: false, error: ERROR_INCOMPLETO };
  }
  const { contrasena } = valor;
  if (typeof contrasena !== "string") {
    return { valido: false, error: ERROR_INCOMPLETO };
  }

  const personales = validarDatosPersonales(valor);
  if (!personales.valido) {
    return personales;
  }

  const errorClave = errorContrasena(contrasena);
  if (errorClave) {
    return { valido: false, error: errorClave };
  }

  return { valido: true, datos: { ...personales.datos, contrasena } };
}

/**
 * Comprueba que los campos obligatorios del formulario tengan contenido.
 * @param valor Datos capturados por el formulario.
 * @param campos Nombres de los campos obligatorios.
 * @returns Si falta alguno.
 */
function faltanCampos(valor: Record<string, unknown>, campos: string[]): boolean {
  return campos.some((campo) => {
    const contenido = valor[campo];
    return typeof contenido !== "string" || !contenido.trim();
  });
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
  if (
    faltanCampos(valor, [
      "primerNombre",
      "primerApellido",
      "idUsuario",
      "edad",
      "correo",
      "contrasena",
      "ocupacion",
    ]) ||
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

/**
 * Comprueba el formulario para completar el registro con Google: todos los
 * campos obligatorios y que ambas contraseñas coincidan.
 * @param valor Datos capturados por el formulario.
 * @param confirmarContrasena Contraseña de confirmación ingresada.
 * @returns Datos validados o error para mostrar.
 */
export function validarFormularioRegistroGoogle(
  valor: unknown,
  confirmarContrasena: string,
): ResultadoValidacion<DatosRegistroGoogle> {
  if (
    !esRegistro(valor) ||
    faltanCampos(valor, [
      "primerNombre",
      "primerApellido",
      "idUsuario",
      "edad",
      "ocupacion",
      "contrasena",
    ]) ||
    confirmarContrasena === ""
  ) {
    return { valido: false, error: "Por favor, completa todos los campos." };
  }

  if (valor.contrasena !== confirmarContrasena) {
    return { valido: false, error: "Las contraseñas no coinciden." };
  }

  return validarRegistroGoogle({
    ...valor,
    edad: Number(valor.edad),
  });
}
