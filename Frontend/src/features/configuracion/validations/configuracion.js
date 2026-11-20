// Reglas de validación de los formularios de configuración.

export function validarPerfil({ nombre, descripcion }) {
  const errores = {};
  if (nombre.trim().length < 3) errores.nombre = "Escribe tu nombre completo.";
  if (descripcion.length > 160) errores.descripcion = "Máximo 160 caracteres.";
  return errores;
}

export function validarContrasena({ actual, nueva, confirmar }) {
  const errores = {};
  if (!actual) errores.actual = "Ingresa tu contraseña actual.";
  if (nueva.length < 8) errores.nueva = "Debe tener al menos 8 caracteres.";
  else if (!/[A-Za-z]/.test(nueva) || !/\d/.test(nueva))
    errores.nueva = "Debe combinar letras y números.";
  else if (nueva === actual) errores.nueva = "Debe ser distinta a la actual.";
  if (confirmar !== nueva) errores.confirmar = "Las contraseñas no coinciden.";
  return errores;
}

export function validarVehiculo({ marca, modelo, color, placa, plazas }) {
  const errores = {};
  if (!marca.trim()) errores.marca = "Indica la marca.";
  if (!modelo.trim()) errores.modelo = "Indica el modelo.";
  if (!color.trim()) errores.color = "Indica el color.";
  // Carro: ABC-123 · Moto: ABC-12D
  if (!/^[A-Z]{3}-?\d{2}[0-9A-Z]$/.test(placa.trim().toUpperCase()))
    errores.placa = "Formato de placa no válido (ej. ABC-123).";
  const n = Number(plazas);
  if (!Number.isInteger(n) || n < 1 || n > 6)
    errores.plazas = "Entre 1 y 6 plazas.";
  return errores;
}

// Valida los campos del vehículo que realmente se persisten.
export function validarDatosVehiculo({ tipo, modelo, capacidad, numeroPuertas, modalidad }) {
  const errores = {};
  if (!modelo.trim()) errores.modelo = "Indica el modelo.";
  else if (modelo.trim().length > 50) errores.modelo = "Máximo 50 caracteres.";
  const n = Number(capacidad);
  if (!Number.isInteger(n) || n < 1 || n > 32767)
    errores.capacidad = "Indica un número entero de plazas (mínimo 1).";
  if (tipo === "Automovil" && ![2, 3, 4, 5].includes(Number(numeroPuertas)))
    errores.numeroPuertas = "Entre 2 y 5 puertas.";
  if (tipo === "Moto" && (!modalidad.trim() || modalidad.trim().length > 20))
    errores.modalidad = "Indica la modalidad (máximo 20 caracteres).";
  return errores;
}

const TIPOS_FOTO =["image/jpeg", "image/png", "image/webp"];
const MAX_FOTO_MB = 2;

// Devuelve un mensaje de error, o "" si la imagen es válida.
export function validarFoto(archivo) {
  if (!archivo) return "";
  if (!TIPOS_FOTO.includes(archivo.type))
    return "Usa una imagen JPG, PNG o WEBP.";
  if (archivo.size > MAX_FOTO_MB * 1024 * 1024)
    return `La imagen no puede pesar más de ${MAX_FOTO_MB} MB.`;
  return "";
}
