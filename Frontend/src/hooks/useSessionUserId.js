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
  return window.sessionStorage.getItem(CLAVE_ID_USUARIO) || "";
}

/** Clave de sessionStorage donde se guarda el id de la sesión. */
export const CLAVE_ID_USUARIO = "cozymov-usuario-id";

/**
 * Alinea sessionStorage con la sesión que verificó el servidor (la cookie).
 * La sesión dura más que la pestaña: tras reiniciar el navegador o abrir otra pestaña la cookie
 * sigue válida pero sessionStorage está vacío. Debe llamarse antes de renderizar a los hijos
 * que usan `useSessionUserId`. No hace nada en el servidor.
 * @param {string} idUsuario Identificador de la sesión verificada.
 * @returns {void}
 */
export function sincronizarIdSesion(idUsuario) {
  if (typeof window === "undefined" || !idUsuario) return;
  if (window.sessionStorage.getItem(CLAVE_ID_USUARIO) !== idUsuario) {
    window.sessionStorage.setItem(CLAVE_ID_USUARIO, idUsuario);
  }
}

/**
 * Lee el identificador de usuario desde sessionStorage de forma compatible con SSR.
 * @returns {string} Identificador de usuario o una cadena vacía.
 */
export function useSessionUserId() {
  return useSyncExternalStore(suscribirSesion, obtenerIdUsuario, () => "");
}
