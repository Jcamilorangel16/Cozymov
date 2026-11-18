// Avisa a los conductores (usuarios con vehículo) de las solicitudes de viaje nuevas.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectarSolicitudesNuevas,
  textoAvisoSolicitudes,
} from "../../buscar-viajes/utils/solicitudes";

/** Cada cuánto se consultan las solicitudes pendientes. */
const INTERVALO_MS = 20_000;

const claveVistas = (idUsuario) => `cozymov-solicitudes-vistas-${idUsuario}`;

function leerVistas(idUsuario) {
  try {
    const guardado = window.localStorage.getItem(claveVistas(idUsuario));
    const vistas = guardado ? JSON.parse(guardado) : null;
    return Array.isArray(vistas) ? vistas : null;
  } catch {
    return null;
  }
}

function guardarVistas(idUsuario, vistas) {
  try {
    window.localStorage.setItem(claveVistas(idUsuario), JSON.stringify(vistas));
  } catch {
    // Sin almacenamiento disponible: solo se pierde el historial entre visitas.
  }
}

/**
 * Consulta periódicamente las solicitudes pendientes de otros usuarios cuando la
 * persona tiene vehículo. Ante solicitudes nuevas muestra un aviso en la aplicación
 * y, si el usuario concedió el permiso, una notificación del navegador.
 * @param {string} idUsuario Usuario autenticado.
 * @param {() => void} alAbrirBuscar Acción para llevar al conductor a «Buscar».
 * @returns {{pendientes: number, aviso: {titulo: string, texto: string}|null, cerrarAviso: () => void}} Total de pendientes y aviso visible.
 */
export function useAvisosSolicitudes(idUsuario, alAbrirBuscar) {
  const [pendientes, setPendientes] = useState(0);
  const [aviso, setAviso] = useState(null);
  const alAbrirRef = useRef(alAbrirBuscar);

  useEffect(() => {
    alAbrirRef.current = alAbrirBuscar;
  });

  const cerrarAviso = useCallback(() => setAviso(null), []);

  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    const { signal } = controlador;
    let temporizador = null;

    function notificarNavegador({ titulo, texto }) {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const notificacion = new Notification(titulo, { body: texto, tag: "cozymov-solicitudes" });
        notificacion.onclick = () => {
          window.focus();
          alAbrirRef.current?.();
          notificacion.close();
        };
      } catch {
        // Algunos navegadores móviles no permiten construir Notification directamente.
      }
    }

    async function consultar() {
      try {
        const respuesta = await fetch("/api/solicitudes?pendientes=1", {
          cache: "no-store",
          signal,
        });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (!Array.isArray(datos) || signal.aborted) return;

        setPendientes(datos.length);
        const { nuevas, vistas } = detectarSolicitudesNuevas(datos, leerVistas(idUsuario));
        guardarVistas(idUsuario, vistas);
        if (nuevas.length > 0) {
          const texto = textoAvisoSolicitudes(nuevas);
          setAviso(texto);
          notificarNavegador(texto);
        }
      } catch {
        // Un fallo de red no debe molestar al usuario: se reintenta en el siguiente ciclo.
      }
    }

    // Una notificación del navegador solo se puede pedir tras un gesto del usuario.
    function pedirPermiso() {
      if ("Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    }

    async function iniciar() {
      try {
        const respuesta = await fetch(`/api/vehiculo?id_usuario=${encodeURIComponent(idUsuario)}`, {
          signal,
        });
        const datos = await respuesta.json();
        // Solo los conductores (con vehículo) pueden aceptar solicitudes.
        if (!respuesta.ok || !datos?.vehiculo || signal.aborted) return;
      } catch {
        return;
      }

      await consultar();
      if (signal.aborted) return;
      temporizador = setInterval(consultar, INTERVALO_MS);
      window.addEventListener("pointerdown", pedirPermiso, { once: true });
    }

    void iniciar();
    return () => {
      controlador.abort();
      if (temporizador) clearInterval(temporizador);
      window.removeEventListener("pointerdown", pedirPermiso);
    };
  }, [idUsuario]);

  return { pendientes, aviso, cerrarAviso };
}
