// Define los datos normalizados que recibe el registro de usuarios.

/** Datos personales validados, comunes al registro normal y al de Google. */
export interface DatosPersonalesRegistro {
  idUsuario: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  edad: number;
  ocupacion: string;
  /** Celular obligatorio, normalizado a E.164 (+573001234567), para recuperar la contraseña. */
  telefono: string;
}

/** Datos validados que se guardan al crear una cuenta. */
export interface DatosRegistroUsuario extends DatosPersonalesRegistro {
  correo: string;
  contrasena: string;
}

/** Datos que completa el usuario al registrarse con Google (el correo lo da Google). */
export interface DatosRegistroGoogle extends DatosPersonalesRegistro {
  contrasena: string;
}
