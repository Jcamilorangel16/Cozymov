// Suscribe un componente a los eventos de tiempo real de la pestaña.
"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { ESTADOS, obtenerGestorTiempoReal } from "../lib/tiempoReal/gestor.js";
import { NOMBRES_EVENTOS } from "../lib/tiempoReal/eventos.js";

const suscribirEstado = (aviso) => obtenerGestorTiempoReal().alCambiarEstado(aviso);
const leerEstado = () => obtenerGestorTiempoReal().estadoActual();
const estadoEnServidor = () => ESTADOS.INACTIVO;

/**
 * Comparte la conexión de la pestaña y entrega los eventos al componente.
 * Los manejadores se leen en cada evento, así que pueden usar el estado más reciente
 * sin volver a suscribirse. Al desmontar se dan de baja y, si era el último componente,
 * la conexión se cierra.
 * @param {Partial<Record<"MensajeNuevo"|"MensajesLeidos"|"ViajeActualizado", (evento: object) => void>>} manejadores
 * @param {{alResincronizar?: () => void, activo?: boolean}} [opciones] `alResincronizar` se
 *   llama tras cada (re)conexión y ante un evento que no se entiende: hay que volver a
 *   consultar por HTTP.
 * @returns {{estado: string, conectado: boolean}} `conectado` en false indica usar la consulta periódica.
 */
export function useTiempoReal(manejadores, { alResincronizar, activo = true } = {}) {
  const manejadoresRef = useRef(manejadores);
  const resincronizarRef = useRef(alResincronizar);

  useEffect(() => {
    manejadoresRef.current = manejadores;
    resincronizarRef.current = alResincronizar;
  });

  useEffect(() => {
    if (!activo) return undefined;
    const gestor = obtenerGestorTiempoReal();
    const bajas = NOMBRES_EVENTOS.map((nombre) =>
      gestor.on(nombre, (evento) => manejadoresRef.current?.[nombre]?.(evento)),
    );
    bajas.push(gestor.alResincronizar(() => resincronizarRef.current?.()));
    const liberar = gestor.usar();
    return () => {
      for (const baja of bajas) baja();
      liberar();
    };
  }, [activo]);

  const estado = useSyncExternalStore(suscribirEstado, leerEstado, estadoEnServidor);
  return { estado, conectado: activo && estado === ESTADOS.CONECTADO };
}
