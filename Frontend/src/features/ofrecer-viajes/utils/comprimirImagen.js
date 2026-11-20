// Reduce imágenes en el navegador para que el registro del vehículo quepa en el
// límite de cuerpo de las funciones de Vercel (4,5 MB por solicitud).

/** Tope del cuerpo que Vercel acepta, con margen para campos de texto y multipart. */
export const MAX_BYTES_SOLICITUD = 4 * 1024 * 1024;

/**
 * Redimensiona una imagen y la recodifica como JPEG.
 * @param {File} archivo Imagen original.
 * @param {{maxLado?: number, calidad?: number}} opciones Lado máximo en píxeles y calidad JPEG (0-1).
 * @returns {Promise<File>} La imagen reducida, o la original si no se puede reducir.
 */
export async function comprimirImagen(archivo, { maxLado = 1600, calidad = 0.8 } = {}) {
  if (!archivo || !archivo.type.startsWith("image/")) return archivo;

  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    // JPEG no tiene transparencia: sin fondo, un PNG transparente saldría negro.
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close?.();

    const blob = await new Promise((resolver) =>
      lienzo.toBlob(resolver, "image/jpeg", calidad),
    );
    if (!blob || blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^.]+$/, "") || "imagen";
    return new File([blob], `${nombre}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    // Formato que el navegador no sabe decodificar: se envía tal cual y valida el servidor.
    return archivo;
  }
}

/**
 * Suma el tamaño de los archivos de un FormData.
 * @param {FormData} datos Formulario a enviar.
 * @returns {number} Bytes totales de los archivos.
 */
export function tamanoArchivos(datos) {
  let total = 0;
  for (const [, valor] of datos.entries()) {
    if (valor instanceof File) total += valor.size;
  }
  return total;
}
