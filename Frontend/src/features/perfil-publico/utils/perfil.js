// Utilidades del perfil público: validación, formato y preparación de la foto.

export const MAX_DESCRIPCION = 160;
/** Igual que PerfilesController.MaximoLongitudFoto en el backend. */
export const MAX_LONGITUD_FOTO = 350_000;
/** Lado máximo, en píxeles, de la foto que se guarda. */
export const LADO_FOTO = 256;

const FORMATO_FOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/**
 * Valida el cuerpo de PUT /api/perfil y devuelve solo los campos admitidos.
 * @param {Record<string, unknown>} cuerpo Datos enviados por el navegador.
 * @returns {{valido: true, datos: {descripcion: string|null, fotoPerfil: string|null}} | {valido: false, error: string}}
 */
export function validarDatosPerfilPublico(cuerpo) {
  const { descripcion = null, fotoPerfil = null } = cuerpo ?? {};

  if (descripcion !== null && typeof descripcion !== "string") {
    return { valido: false, error: "La descripción no es válida." };
  }
  if (typeof descripcion === "string" && descripcion.trim().length > MAX_DESCRIPCION) {
    return { valido: false, error: `La descripción admite máximo ${MAX_DESCRIPCION} caracteres.` };
  }
  if (
    fotoPerfil !== null &&
    (typeof fotoPerfil !== "string" ||
      fotoPerfil.length > MAX_LONGITUD_FOTO ||
      !FORMATO_FOTO.test(fotoPerfil))
  ) {
    return { valido: false, error: "La foto debe ser una imagen JPG, PNG o WEBP de máximo 250 KB." };
  }

  return {
    valido: true,
    datos: {
      descripcion: descripcion?.trim() || null,
      fotoPerfil,
    },
  };
}

/**
 * Indica si una foto puede mostrarse en un <img>: solo data URLs de imagen,
 * para no cargar recursos externos que alguien haya guardado.
 * @param {unknown} foto Valor recibido del servidor.
 */
export function esFotoMostrable(foto) {
  return typeof foto === "string" && foto.length <= MAX_LONGITUD_FOTO && FORMATO_FOTO.test(foto);
}

/** Inicial para el avatar cuando no hay foto. */
export function inicialNombre(nombre) {
  return String(nombre ?? "").trim().charAt(0).toUpperCase() || "?";
}

/**
 * "Miembro desde noviembre de 2026".
 * @param {string|null|undefined} fecha Fecha ISO de registro.
 */
export function formatearMiembroDesde(fecha) {
  const valor = new Date(fecha ?? "");
  if (Number.isNaN(valor.getTime())) return "";
  const texto = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(valor);
  return `Miembro desde ${texto}`;
}

/**
 * Estrellas llenas (redondeadas) para un promedio de 1 a 5.
 * @param {number|null|undefined} promedio
 */
export function estrellasLlenas(promedio) {
  const n = Number(promedio);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(5, Math.max(0, Math.round(n)));
}

/**
 * Reduce la imagen elegida a un cuadrado de LADO_FOTO px y la devuelve como
 * data URL JPEG, para que pese pocos KB al guardarla. Solo en el navegador.
 * @param {File} archivo Imagen JPG, PNG o WEBP ya validada.
 * @returns {Promise<string>}
 */
export async function prepararFotoPerfil(archivo) {
  const mapa = await createImageBitmap(archivo);
  try {
    const lado = Math.min(mapa.width, mapa.height);
    const destino = Math.min(LADO_FOTO, lado);
    const lienzo = document.createElement("canvas");
    lienzo.width = destino;
    lienzo.height = destino;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    // Fondo blanco por si la imagen tiene transparencia (JPEG no la admite).
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, destino, destino);
    ctx.drawImage(
      mapa,
      (mapa.width - lado) / 2,
      (mapa.height - lado) / 2,
      lado,
      lado,
      0,
      0,
      destino,
      destino,
    );
    return lienzo.toDataURL("image/jpeg", 0.85);
  } finally {
    mapa.close();
  }
}
