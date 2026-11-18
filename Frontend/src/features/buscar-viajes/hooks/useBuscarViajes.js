// Coordina filtros, carga de viajes y validación de disponibilidad del usuario.
"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { filtrarSolicitudes, solicitudesPropiasPendientes } from "../utils/solicitudes";
import { consultarViajes, ordenarViajesPorSimilitud } from "../utils/viajes";

/** Cada cuánto se refrescan las solicitudes mientras «Buscar» está abierto. */
const INTERVALO_SOLICITUDES_MS = 20_000;
import { useSessionUserId } from "../../../hooks/useSessionUserId";

/**
 * Gestiona la consulta de viajes y la elegibilidad para aceptar uno.
 * @param {string} [idUsuarioServidor] Identificador de la sesión verificada en el servidor.
 * @returns Estado de búsqueda, campos de filtro y acción para buscar.
 */
export function useBuscarViajes(idUsuarioServidor = "") {
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
  // Solicitudes pendientes de otros usuarios y elegibilidad para aceptarlas.
  const [solicitudes, setSolicitudes] = useState([]);
  // Arranca en «cargando»: la consulta se lanza al montar y SolicitudesPendientes no se ve sin sesión.
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [errorSolicitudes, setErrorSolicitudes] = useState("");
  const [tieneVehiculo, setTieneVehiculo] = useState(null);
  const [aceptandoSolicitudId, setAceptandoSolicitudId] = useState(null);
  // Solicitudes que el propio usuario pidió como pasajero y siguen esperando conductor.
  const [misSolicitudes, setMisSolicitudes] = useState([]);
  const [errorMisSolicitudes, setErrorMisSolicitudes] = useState("");
  const [eliminandoSolicitudId, setEliminandoSolicitudId] = useState(null);
  // Filtros con los que se hizo la última búsqueda; las solicitudes también los respetan.
  const [filtrosAplicados, setFiltrosAplicados] = useState({ origen: "", destino: "", fecha: "" });
  // sessionStorage se pierde al abrir otra pestaña aunque la sesión siga activa; el id que
  // verifica el servidor (cookie) sirve de respaldo para no ocultar las solicitudes.
  const idSesionNavegador = useSessionUserId();
  const idUsuario = idSesionNavegador || String(idUsuarioServidor || "");

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

  // Solicitudes pendientes de otros usuarios y vehículo propio (requisito para aceptarlas).
  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    Promise.all([
      fetch("/api/solicitudes?pendientes=1", {
        cache: "no-store",
        signal: controlador.signal,
      }),
      fetch(`/api/vehiculo?id_usuario=${encodeURIComponent(idUsuario)}`, {
        signal: controlador.signal,
      }),
    ])
      .then(async ([respuestaSolicitudes, respuestaVehiculo]) => {
        const [datosSolicitudes, datosVehiculo] = await Promise.all([
          respuestaSolicitudes.json(),
          respuestaVehiculo.json(),
        ]);
        if (!respuestaSolicitudes.ok) {
          throw new Error(
            datosSolicitudes.error || "No se pudieron consultar las solicitudes pendientes.",
          );
        }

        setSolicitudes(Array.isArray(datosSolicitudes) ? datosSolicitudes : []);
        setTieneVehiculo(respuestaVehiculo.ok ? Boolean(datosVehiculo?.vehiculo) : null);
      })
      .catch((errorConsulta) => {
        if (errorConsulta.name !== "AbortError") {
          setErrorSolicitudes(
            errorConsulta.message || "No se pudieron consultar las solicitudes pendientes.",
          );
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargandoSolicitudes(false);
      });

    return () => controlador.abort();
  }, [idUsuario]);

  // Solicitudes propias: se cargan al abrir «Buscar» y se refrescan junto con las demás.
  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    fetch("/api/solicitudes", { cache: "no-store", signal: controlador.signal })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudieron consultar tus solicitudes.");
        }
        setMisSolicitudes(solicitudesPropiasPendientes(datos));
      })
      .catch((errorConsulta) => {
        if (errorConsulta.name !== "AbortError") {
          setErrorMisSolicitudes(
            errorConsulta.message || "No se pudieron consultar tus solicitudes.",
          );
        }
      });

    return () => controlador.abort();
  }, [idUsuario]);

  // Las solicitudes nuevas de otros pasajeros aparecen sin recargar la sección, y una
  // solicitud propia que un conductor acepta deja de listarse como pendiente.
  useEffect(() => {
    if (!idUsuario) return undefined;

    const controlador = new AbortController();
    async function leerLista(url) {
      const respuesta = await fetch(url, { cache: "no-store", signal: controlador.signal });
      const datos = await respuesta.json();
      return respuesta.ok && Array.isArray(datos) && !controlador.signal.aborted ? datos : null;
    }

    const temporizador = setInterval(async () => {
      try {
        const [ajenas, propias] = await Promise.all([
          leerLista("/api/solicitudes?pendientes=1"),
          leerLista("/api/solicitudes"),
        ]);
        if (ajenas) setSolicitudes(ajenas);
        if (propias) setMisSolicitudes(solicitudesPropiasPendientes(propias));
      } catch {
        // Se conservan las listas actuales y se reintenta en el siguiente ciclo.
      }
    }, INTERVALO_SOLICITUDES_MS);

    return () => {
      controlador.abort();
      clearInterval(temporizador);
    };
  }, [idUsuario]);

  const solicitudesVisibles = useMemo(
    () => filtrarSolicitudes(solicitudes, filtrosAplicados),
    [solicitudes, filtrosAplicados],
  );

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
      setFiltrosAplicados(filtros);
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
      setError(errorAceptacion.message || "No se pudo aceptar el viaje.");
    } finally {
      setAceptandoViajeId(null);
    }
  }

  /**
   * El pasajero elimina una solicitud suya que ningún conductor ha aceptado.
   * @param {{idSolicitud: number, origen?: string, destino?: string}} solicitud Solicitud propia.
   * @returns {Promise<void>}
   */
  async function handleEliminarSolicitud(solicitud) {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar tu solicitud?",
      text: `${solicitud.origen ?? ""} → ${solicitud.destino ?? ""}\n\nLos conductores dejarán de verla.`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Conservarla",
      confirmButtonColor: "#dc3545",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setEliminandoSolicitudId(solicitud.idSolicitud);
    setErrorMisSolicitudes("");
    try {
      const respuesta = await fetch(
        `/api/solicitudes?id=${encodeURIComponent(solicitud.idSolicitud)}`,
        { method: "DELETE" },
      );
      if (!respuesta.ok) {
        // Un 409 significa que un conductor la aceptó mientras tanto: el backend lo explica.
        const texto = await respuesta.text();
        let mensaje = "";
        try {
          mensaje = texto ? JSON.parse(texto)?.error : "";
        } catch {
          mensaje = "";
        }
        throw new Error(mensaje || "No se pudo eliminar la solicitud.");
      }

      setMisSolicitudes((actuales) =>
        actuales.filter((actual) => actual.idSolicitud !== solicitud.idSolicitud),
      );
    } catch (errorEliminacion) {
      setErrorMisSolicitudes(errorEliminacion.message || "No se pudo eliminar la solicitud.");
    } finally {
      setEliminandoSolicitudId(null);
    }
  }

  /**
   * Un conductor con vehículo acepta una solicitud pendiente: la API crea el viaje
   * privado y la reserva del pasajero, sin publicar ningún viaje.
   * @param {{idSolicitud: number, origen?: string, destino?: string}} solicitud Solicitud elegida.
   * @param {() => void} [alAceptar] Acción posterior, normalmente ir a «En curso».
   * @returns {Promise<void>}
   */
  async function handleAceptarSolicitud(solicitud, alAceptar) {
    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Aceptar esta solicitud?",
      text:
        `${solicitud.origen ?? ""} → ${solicitud.destino ?? ""}` +
        (tieneViajePublicado
          ? "\n\nTu viaje publicado se eliminará al aceptar esta solicitud."
          : ""),
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar solicitud",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#198754",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setAceptandoSolicitudId(solicitud.idSolicitud);
    setErrorSolicitudes("");
    try {
      const respuesta = await fetch("/api/solicitudes/aceptar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_solicitud: solicitud.idSolicitud }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo aceptar la solicitud.");
      }
      if (!resultado.reserva) {
        throw new Error("La respuesta del servidor no confirmó la reserva.");
      }

      setSolicitudes((actuales) =>
        actuales.filter((actual) => actual.idSolicitud !== solicitud.idSolicitud),
      );
      setTieneViajeEnCurso(true);
      // El backend retira los viajes publicados del conductor al aceptar la solicitud.
      setTieneViajePublicado(false);
      setViajes((actuales) => actuales.filter((viaje) => String(viaje.id_usuario) !== idUsuario));
      await Swal.fire({
        icon: "success",
        title: "Solicitud aceptada",
        text: "El viaje ya está disponible en «En curso».",
        confirmButtonText: "Ver viaje",
      });
      alAceptar?.();
    } catch (errorAceptacion) {
      setErrorSolicitudes(errorAceptacion.message || "No se pudo aceptar la solicitud.");
    } finally {
      setAceptandoSolicitudId(null);
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
    solicitudes: solicitudesVisibles,
    totalSolicitudes: solicitudes.length,
    cargandoSolicitudes,
    errorSolicitudes,
    tieneVehiculo,
    aceptandoSolicitudId,
    handleAceptarSolicitud,
    misSolicitudes,
    errorMisSolicitudes,
    eliminandoSolicitudId,
    handleEliminarSolicitud,
  };
}
