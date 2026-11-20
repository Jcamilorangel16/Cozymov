// Lleva al conductor o al pasajero a «En curso» cuando le aceptan un viaje.
"use client";

import { useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { useTiempoReal } from "../../../hooks/useTiempoReal";
import {
  claveViajeActivo,
  decidirRedireccion,
  textoViajeAceptado,
} from "../utils/viajeActivo";

/** Sin tiempo real, cada cuánto se consulta si hay un viaje activo. */
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
 * Consulta /api/viajes/en-curso al abrir la app, al volver a la pestaña y cada vez que el
 * servidor avisa de un cambio en una reserva o un viaje del usuario (sin tiempo real, cada
 * 15 s). Cuando aparece un viaje activo que el usuario no había visto (un conductor aceptó
 * su solicitud o un pasajero tomó su viaje publicado), lo lleva a «En curso» y lo avisa. Al
 * abrir la app con un viaje activo también entra directo a «En curso».
 * @param {string} idUsuario Usuario autenticado.
 * @param {{vistaActiva: string, irAVista: (id: string) => void}} navegacion Vista y navegación del menú.
 * @returns {void}
 */
export function useRedirigirViajeEnCurso(idUsuario, { vistaActiva, irAVista }) {
  const navegacionRef = useRef({ vistaActiva, irAVista });
  const consultarRef = useRef(null);
  useEffect(() => {
    navegacionRef.current = { vistaActiva, irAVista };
  });

  // El evento no trae los datos: se consultan por HTTP, con la autorización de siempre.
  const { conectado } = useTiempoReal(
    { ViajeActualizado: () => void consultarRef.current?.() },
    { activo: Boolean(idUsuario), alResincronizar: () => void consultarRef.current?.() },
  );

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
        // Un fallo de red se reintenta en la siguiente consulta.
      }
    }

    consultarRef.current = consultar;
    void consultar();
    const alVolverVisible = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    document.addEventListener("visibilitychange", alVolverVisible);
    return () => {
      controlador.abort();
      consultarRef.current = null;
      document.removeEventListener("visibilitychange", alVolverVisible);
    };
  }, [idUsuario]);

  // Respaldo HTTP mientras no hay conexión de tiempo real.
  useEffect(() => {
    if (!idUsuario || conectado) return undefined;
    const temporizador = setInterval(() => void consultarRef.current?.(), INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [idUsuario, conectado]);
}
