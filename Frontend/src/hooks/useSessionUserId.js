// Expone el identificador de sesión guardado en el navegador a componentes cliente.
"use client";

import { useSyncExternalStore } from "react";

/**
 * Proporciona la función de suscripción requerida por useSyncExternalStore.
 * @returns Función de limpieza sin listeners, ya que sessionStorage no emite eventos.
 */
function suscribirSesion() {
  return () => {};
}

/**
 * Lee el identificador de usuario de la sesión del navegador.
 * @returns Identificador almacenado o una cadena vacía.
 */
function obtenerIdUsuario() {
  return window.sessionStorage.getItem("cozymov-usuario-id") || "";
}

/**
 * Lee el identificador de usuario desde sessionStorage de forma compatible con SSR.
 * @returns {string} Identificador de usuario o una cadena vacía.
 */
export function useSessionUserId() {
  return useSyncExternalStore(suscribirSesion, obtenerIdUsuario, () => "");
}
