// Define los enlaces de navegación principal (icono de Bootstrap Icons).

export const enlacesMenu = [
  { id: "inicio", label: "Inicio", icono: "bi-house-heart-fill" },
  { id: "buscar", label: "Buscar", icono: "bi-search-heart-fill" },
  { id: "ofrecer", label: "Ofrecer Viaje", icono: "bi-car-front-fill" },
  { id: "mensajes", label: "Mensajes", icono: "bi-chat-dots-fill" },
  { id: "en-curso", label: "En Curso", icono: "bi-signpost-split-fill" },
  { id: "calificaciones", label: "Calificaciones", icono: "bi-star-fill" },
];

/**
 * Nombre visible de una sección del menú (incluye las que no están en la barra lateral).
 * @param {string} id Identificador de la sección.
 * @returns {string} Etiqueta legible.
 */
export function etiquetaDeVista(id) {
  if (id === "configuracion") return "Configuración";
  return enlacesMenu.find((enlace) => enlace.id === id)?.label ?? id;
}
