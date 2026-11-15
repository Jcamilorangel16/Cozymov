"use client";

import { useEffect, useState } from "react";
import { useSessionUserId } from "../../../hooks/useSessionUserId";

export function usePanelInicio() {
  const idUsuario = useSessionUserId();
  const [viajes, setViajes] = useState([]);
  const [viajePublicado, setViajePublicado] = useState(null);
  const [estadoVehiculo, setEstadoVehiculo] = useState({
    idUsuario: null,
    estado: "cargando",
  });
  const [viajeReservado, setViajeReservado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!idUsuario) return;

    const controlador = new AbortController();

    async function cargarVehiculo() {
      try {
        const respuesta = await fetch(
          `/api/vehiculo?id_usuario=${encodeURIComponent(idUsuario)}`,
          { signal: controlador.signal },
        );
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(resultado.error || "No se pudo consultar tu vehículo.");
        }
        if (
          typeof resultado !== "object" ||
          resultado === null ||
          Array.isArray(resultado) ||
          !("vehiculo" in resultado)
        ) {
          throw new Error("La respuesta del servidor no contiene el vehículo esperado.");
        }

        setEstadoVehiculo({
          idUsuario,
          estado: resultado.vehiculo ? "registrado" : "sin-vehiculo",
        });
      } catch (errorConsulta) {
        if (errorConsulta.name !== "AbortError") {
          console.error("No se pudo consultar el vehículo desde el panel:", errorConsulta);
          setEstadoVehiculo({ idUsuario, estado: "error" });
        }
      }
    }

    void cargarVehiculo();
    return () => controlador.abort();
  }, [idUsuario]);

  useEffect(() => {
    if (!idUsuario) return;

    const controlador = new AbortController();
    Promise.all([
      fetch("/api/viajes", { signal: controlador.signal }),
      fetch(`/api/viajes?id_usuario=${encodeURIComponent(idUsuario)}`, {
        signal: controlador.signal,
      }),
      fetch("/api/viajes/en-curso", { signal: controlador.signal }),
    ])
      .then(async ([respuestaViajes, respuestaPublicado, respuestaReservado]) => {
        const [datosViajes, datosPublicado, datosReservado] = await Promise.all([
          respuestaViajes.json(),
          respuestaPublicado.json(),
          respuestaReservado.json(),
        ]);
        if (!respuestaViajes.ok) {
          throw new Error(datosViajes.error || "No se pudieron consultar los viajes.");
        }
        if (!respuestaPublicado.ok) {
          throw new Error(
            datosPublicado.error || "No se pudo consultar tu viaje publicado.",
          );
        }
        if (!respuestaReservado.ok) {
          throw new Error(
            datosReservado.error || "No se pudo consultar tu viaje reservado.",
          );
        }
        if (
          !Array.isArray(datosViajes.viajes) ||
          !("viaje" in datosPublicado) ||
          !("viaje" in datosReservado)
        ) {
          throw new Error("La respuesta del servidor no contiene los datos de viajes esperados.");
        }

        setViajes(datosViajes.viajes);
        setViajePublicado(datosPublicado.viaje);
        setViajeReservado(datosReservado.viaje);
      })
      .catch((errorConsulta) => {
        if (errorConsulta.name !== "AbortError") {
          setError(errorConsulta.message || "No se pudo cargar el panel de viajes.");
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [idUsuario, intento]);

  function reintentar() {
    setCargando(true);
    setError("");
    setIntento((actual) => actual + 1);
  }

  return {
    idUsuario,
    viajes,
    viajePublicado,
    estadoVehiculo: estadoVehiculo.idUsuario === idUsuario
      ? estadoVehiculo.estado
      : "cargando",
    viajeReservado,
    cargando,
    error,
    reintentar,
  };
}
