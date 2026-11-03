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