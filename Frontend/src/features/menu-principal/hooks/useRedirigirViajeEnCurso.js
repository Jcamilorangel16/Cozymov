// Lleva al conductor o al pasajero a «En curso» cuando le aceptan un viaje.
"use client";

import { useEffect, useRef } from "react";
import Swal from "sweetalert2";
import {
  claveViajeActivo,
  decidirRedireccion,
  textoViajeAceptado,
} from "../utils/viajeActivo";

/** Cada cuánto se consulta si hay un viaje activo. */
const INTERVALO_MS = 15_000;
const CLAVE_VISTO = "cozymov-viaje-en-curso-visto";

function leerVisto() {
  try {
    return window.sessionStorage.getItem(CLAVE_VISTO);
  } catch {
    return null;
  }
}

function guardarVisto(clave) {
  try {
    window.sessionStorage.setItem(CLAVE_VISTO, clave);
  } catch {
    // Sin almacenamiento solo se repetiría el aviso tras recargar.
  }
}

/**
 * Consulta periódicamente /api/viajes/en-curso. Cuando aparece un viaje activo
 * que el usuario no había visto (un conductor aceptó su solicitud o un pasajero
 * tomó su viaje publicado), lo lleva a «En curso» y lo avisa. Al abrir la app
 * con un viaje activo también entra directo a «En curso».
 * @param {string} idUsuario Usuario autenticado.
 * @param {{vistaActiva: string, irAVista: (id: string) => void}} navegacion Vista y navegación del menú.
 * @returns {void}
 */
export function useRedirigirViajeEnCurso(idUsuario, { vistaActiva, irAVista }) {
  const navegacionRef = useRef({ vistaActiva, irAVista });
  useEffect(() => {
    navegacionRef.current = { vistaActiva, irAVista };
  });

  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    let esPrimeraConsulta = true;

    async function consultar() {
      if (document.visibilityState === "hidden") return;
      try {
        const respuesta = await fetch("/api/viajes/en-curso", {
          cache: "no-store",
          signal: controlador.signal,
        });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (controlador.signal.aborted) return;

        const clave = claveViajeActivo(datos);
        const { vistaActiva: vista, irAVista: ir } = navegacionRef.current;
        const { redirigir, avisar } = decidirRedireccion({
          clave,
          claveVista: leerVisto(),
          esPrimeraConsulta,
          vistaActiva: vista,
        });
        esPrimeraConsulta = false;
        if (!clave) return;

        guardarVisto(clave);
        if (!redirigir) return;
        ir("en-curso");
        // No se tapa otra ventana abierta (p. ej. una confirmación en curso).
        if (avisar && !Swal.isVisible()) {
          const { titulo, texto } = textoViajeAceptado(datos);
          void Swal.fire({ icon: "success", title: titulo, text: texto, confirmButtonText: "Ver viaje" });
        }
      } catch {
        // Un fallo de red se reintenta en el siguiente ciclo.
      }
    }

    void consultar();
    const temporizador = setInterval(consultar, INTERVALO_MS);
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    document.addEventListener("visibilitychange", alVolverVisible);
    return () => {
      controlador.abort();
      clearInterval(temporizador);
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, [idUsuario]);
}
