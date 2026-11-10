// Coordina filtros, carga de viajes y validación de disponibilidad del usuario.
"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { consultarViajes, ordenarViajesPorSimilitud } from "../utils/viajes";
import { useSessionUserId } from "../../../hooks/useSessionUserId";

/**
 * Gestiona la consulta de viajes y la elegibilidad para aceptar uno.
 * @returns Estado de búsqueda, campos de filtro y acción para buscar.
 */
export function useBuscarViajes() {
  // Criterios que el usuario edita antes de iniciar una búsqueda.
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  // Resultados y estado visible de la búsqueda.
  const [viajes, setViajes] = useState([]);
  const [buscando, setBuscando] = useState(true);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState("");
  // Estado necesario para habilitar aceptar un viaje.
  const [tieneViajePublicado, setTieneViajePublicado] = useState(null);
  const [tieneViajeEnCurso, setTieneViajeEnCurso] = useState(false);
  const [validacionCompletada, setValidacionCompletada] = useState(false);
  const [eliminandoViajeId, setEliminandoViajeId] = useState(null);
  const [aceptandoViajeId, setAceptandoViajeId] = useState(null);
  const idUsuario = useSessionUserId();

  useEffect(() => {
    const controlador = new AbortController();
    consultarViajes({}, controlador.signal)
      .then((viajesCargados) => {
        setViajes(viajesCargados);
        setBusquedaRealizada(true);
      })
      .catch((errorConsulta) => {
        if (errorConsulta.name !== "AbortError") {
          setError(errorConsulta.message || "No se pudieron consultar los viajes.");
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setBuscando(false);
      });

    if (idUsuario) {
      Promise.all([
        fetch(`/api/viajes?id_usuario=${encodeURIComponent(idUsuario)}`, {
          signal: controlador.signal,
        }),
        fetch("/api/viajes/en-curso", { signal: controlador.signal }),
      ])
        .then(async ([respuestaPublicado, respuestaEnCurso]) => {
          const [publicado, enCurso] = await Promise.all([
            respuestaPublicado.json(),
            respuestaEnCurso.json(),
          ]);
          if (!respuestaPublicado.ok) {
            throw new Error(publicado.error || "No se pudo validar tu viaje publicado.");
          }
          if (!respuestaEnCurso.ok) {
            throw new Error(enCurso.error || "No se pudo validar tu viaje en curso.");
          }
          if (!("viaje" in publicado) || !("viaje" in enCurso)) {
            throw new Error("No se pudo validar el estado de tus viajes.");
          }
          setTieneViajePublicado(Boolean(publicado.viaje));
          setTieneViajeEnCurso(Boolean(enCurso.viaje));
        })
        .catch((errorConsulta) => {
          if (errorConsulta.name !== "AbortError") {
            setTieneViajePublicado(null);
            setError(
              errorConsulta.message || "No se pudo validar tu viaje publicado.",
            );
          }
        })
        .finally(() => {
          if (!controlador.signal.aborted) setValidacionCompletada(true);
        });
    }

    return () => controlador.abort();
  }, [idUsuario]);

  /**
   * Busca los viajes disponibles y los ordena según los filtros del usuario.
   * @param {React.FormEvent<HTMLFormElement>} evento Envío del formulario.
   * @returns {Promise<void>}
   */
  async function handleBuscar(evento) {
    evento.preventDefault();
    setBuscando(true);
    setError("");

    try {
      const todosLosViajes = await consultarViajes({});
      const filtros = {
        origen: origen.trim(),
        destino: destino.trim(),
        fecha,
      };
      setViajes(ordenarViajesPorSimilitud(todosLosViajes, filtros));
      setBusquedaRealizada(true);
    } catch (errorConsulta) {
      setError(errorConsulta.message || "No se pudieron consultar los viajes.");
    } finally {
      setBuscando(false);
    }
  }

  async function handleEliminarViaje(viaje) {
    const idViaje = viaje.id_viaje;
    if (!idUsuario || String(viaje.id_usuario) !== idUsuario) {
      setError("Solo puedes eliminar un viaje que hayas publicado.");
      return;
    }

    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar este viaje?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setEliminandoViajeId(idViaje);
    setError("");
    try {
      const respuesta = await fetch(
        `/api/viajes?id_viaje=${encodeURIComponent(idViaje)}`,
        { method: "DELETE" },
      );
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo eliminar el viaje.");
      }

      setViajes((viajesActuales) =>
        viajesActuales.filter((viajeActual) => viajeActual.id_viaje !== idViaje),
      );
      setTieneViajePublicado(false);
      void Swal.fire({
        icon: "success",
        title: "Viaje eliminado",
        text: "El viaje se eliminó correctamente.",
      });
    } catch (errorEliminacion) {
      console.error("No se pudo eliminar el viaje:", errorEliminacion);
      setError(errorEliminacion.message || "No se pudo eliminar el viaje.");
    } finally {
      setEliminandoViajeId(null);
    }
  }

  async function handleAceptarViaje(viaje, alAceptar) {
    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Aceptar este viaje?",
      text: `${viaje.origen} → ${viaje.destino}`,
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar viaje",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#198754",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setAceptandoViajeId(viaje.id_viaje);
    setError("");
    try {
      const respuesta = await fetch("/api/viajes/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_viaje: viaje.id_viaje }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo aceptar el viaje.");
      }
      if (!resultado.reserva) {
        throw new Error("La respuesta del servidor no confirmó la reserva.");
      }

      setTieneViajeEnCurso(true);
      setViajes((viajesActuales) =>
        viajesActuales.map((viajeActual) =>
          viajeActual.id_viaje === viaje.id_viaje
            ? {
                ...viajeActual,
                cupos_disponibles: Math.max(
                  0,
                  Number(viajeActual.cupos_disponibles) - 1,
                ),
              }
            : viajeActual,
        ),
      );
      await Swal.fire({
        icon: "success",
        title: "Viaje aceptado",
        text: "Tu viaje ya está disponible en «En curso».",
        confirmButtonText: "Ver viaje",
      });
      alAceptar?.();
    } catch (errorAceptacion) {
      console.error("No se pudo aceptar el viaje:", errorAceptacion);
      setError(errorAceptacion.message || "No se pudo aceptar el viaje.");
    } finally {
      setAceptandoViajeId(null);
    }
  }

  return {
    origen,
    setOrigen,
    destino,
    setDestino,
    fecha,
    setFecha,
    viajes,
    buscando,
    busquedaRealizada,
    error,
    tieneViajePublicado,
    tieneViajeEnCurso,
    validacionCompletada,
    idUsuario,
    eliminandoViajeId,
    aceptandoViajeId,
    handleBuscar,
    handleEliminarViaje,
    handleAceptarViaje,
  };
}
