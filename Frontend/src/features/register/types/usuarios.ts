// Define los datos normalizados que recibe el registro de usuarios.

/** Datos validados que se guardan al crear una cuenta. */
export interface DatosRegistroUsuario {
  idUsuario: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  edad: number;
  correo: string;
  contrasena: string;
  ocupacion: string;
}
