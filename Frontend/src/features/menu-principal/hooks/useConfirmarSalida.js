// Pregunta antes de dejar la plataforma cuando el usuario pulsa «atrás» en el navegador.
"use client";

import { useEffect } from "react";
import Swal from "sweetalert2";
import { instalarGuardiaSalida } from "../utils/guardiaSalida";

/**
 * Mientras el menú esté abierto, «atrás» no saca al usuario de la plataforma: muestra una
 * ventana para confirmarlo. Un segundo «atrás» con la ventana abierta confirma la salida.
 * La sesión no se cierra: sigue iniciada en el dispositivo.
 * @returns {void}
 */
export function useConfirmarSalida() {
  useEffect(
    () =>
      instalarGuardiaSalida(window, {
        pedirConfirmacion: async () => {
          const respuesta = await Swal.fire({
            icon: "question",
            title: "¿Salir de la plataforma?",
            text: "Si vuelves atrás saldrás de Cozymov. Tu sesión seguirá iniciada en este dispositivo.",
            showCancelButton: true,
            confirmButtonText: "Sí, salir",
            cancelButtonText: "Quedarme",
            reverseButtons: true,
            allowOutsideClick: false,
          });
          return respuesta.isConfirmed;
        },
        cerrarConfirmacion: () => Swal.close(),
        hayOtroAviso: () => Swal.isVisible(),
      }),
    [],
  );
}
