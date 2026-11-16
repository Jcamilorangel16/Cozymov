"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useSessionUserId } from "../../../hooks/useSessionUserId";
import barriosRutaCotidiana from "../../ofrecer-viajes/constants/barriosRutaCotidiana";
import { consultarViajes } from "../../buscar-viajes/utils/viajes";
import {
  combinarFechaHora,
  construirCatalogoDestinos,
  filtrarSugerencias,
  rutasCompatibles,
  validarSolicitud,
} from "../utils/destinosInicio";

async function leerJson(respuesta, mensaje) {
  const texto = await respuesta.text();
  let resultado = null;
  try {
    resultado = texto ? JSON.parse(texto) : null;
  } catch {
    resultado = null;
  }
  if (!respuesta.ok) throw new Error(resultado?.error || mensaje);
  return resultado;
}

export function usePanelInicio() {
  const idUsuario = useSessionUserId();
  const [viajePublicado, setViajePublicado] = useState(null);
  const [estadoVehiculo, setEstadoVehiculo] = useState({
    idUsuario: null,
    estado: "cargando",
  });
  const [viajeReservado, setViajeReservado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  // Buscador de destino, resultados y solicitud.
  const [rutas, setRutas] = useState([]);
  const [consulta, setConsulta] = useState("");
  const [destinoElegido, setDestinoElegido] = useState(null);
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [calificaciones, setCalificaciones] = useState({});
  const [aceptandoId, setAceptandoId] = useState(null);
  const [errorAccion, setErrorAccion] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [errorSolicitud, setErrorSolicitud] = useState("");
  const [solicitudCreada, setSolicitudCreada] = useState(false);
  const busquedaRef = useRef(null);
  const calificacionesPedidas = useRef(new Set());

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
      fetch(`/api/viajes?id_usuario=${encodeURIComponent(idUsuario)}`, {
        signal: controlador.signal,
      }),
      fetch("/api/viajes/en-curso", { signal: controlador.signal }),
    ])
      .then(async ([respuestaPublicado, respuestaReservado]) => {
        const [datosPublicado, datosReservado] = await Promise.all([
          respuestaPublicado.json(),
          respuestaReservado.json(),
        ]);
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
        if (!("viaje" in datosPublicado) || !("viaje" in datosReservado)) {
          throw new Error("La respuesta del servidor no contiene los datos de viajes esperados.");
        }

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

  // Rutas persistidas: el catálogo local sigue funcionando si esta consulta falla.
  useEffect(() => {
    if (!idUsuario) return;
    const controlador = new AbortController();
    fetch("/api/rutas", { cache: "no-store", signal: controlador.signal })
      .then((respuesta) => leerJson(respuesta, "No se pudieron consultar las rutas."))
      .then((datos) => setRutas(Array.isArray(datos) ? datos : []))
      .catch((errorRutas) => {
        if (errorRutas.name !== "AbortError") {
          console.error("No se pudieron cargar las rutas del panel:", errorRutas);
        }
      });
    return () => controlador.abort();
  }, [idUsuario]);

  const catalogoDestinos = useMemo(
    () => construirCatalogoDestinos(barriosRutaCotidiana, rutas),
    [rutas],
  );
  const sugerencias = useMemo(
    () => (destinoElegido === null ? filtrarSugerencias(catalogoDestinos, consulta) : []),
    [catalogoDestinos, consulta, destinoElegido],
  );
  const rutasDelDestino = useMemo(
    () => (destinoElegido ? rutasCompatibles(rutas, destinoElegido) : []),
    [rutas, destinoElegido],
  );

  function reiniciarResultados() {
    busquedaRef.current?.abort();
    setBuscando(false);
    setResultados([]);
    setViajeSeleccionado(null);
    setErrorBusqueda("");
    setErrorAccion("");
    setErrorSolicitud("");
    setSolicitudCreada(false);
  }

  function cambiarConsulta(texto) {
    setConsulta(texto);
    setDestinoElegido(null);
    reiniciarResultados();
  }

  async function cargarCalificaciones(viajes) {
    const ids = [...new Set(viajes.map((v) => v.id_usuario).filter((id) => id != null))]
      .map(String)
      .filter((id) => !calificacionesPedidas.current.has(id));
    ids.forEach((id) => calificacionesPedidas.current.add(id));
    setCalificaciones((actual) => ({
      ...actual,
      ...Object.fromEntries(ids.map((id) => [id, { estado: "cargando" }])),
    }));
    await Promise.all(ids.map(async (id) => {
      let entrada;
      try {
        const resumen = await leerJson(
          await fetch(`/api/calificaciones?resumen=${encodeURIComponent(id)}`, {
            cache: "no-store",
          }),
          "No se pudo consultar la calificación.",
        );
        entrada = {
          estado: "listo",
          promedio: resumen?.promedio ?? null,
          total: resumen?.total ?? 0,
        };
      } catch {
        // Permite reintentar en una búsqueda posterior.
        calificacionesPedidas.current.delete(id);
        entrada = { estado: "error" };
      }
      setCalificaciones((actual) => ({ ...actual, [id]: entrada }));
    }));
  }

  async function buscarPorDestino(destino) {
    busquedaRef.current?.abort();
    const controlador = new AbortController();
    busquedaRef.current = controlador;

    setConsulta(destino);
    setDestinoElegido(destino);
    setResultados([]);
    setViajeSeleccionado(null);
    setErrorBusqueda("");
    setErrorAccion("");
    setErrorSolicitud("");
    setSolicitudCreada(false);
    setBuscando(true);
    try {
      const viajes = await consultarViajes({ destino }, controlador.signal);
      if (controlador.signal.aborted) return;
      setResultados(viajes);
      if (viajes.length === 1) setViajeSeleccionado(viajes[0]);
      void cargarCalificaciones(viajes);
    } catch (errorConsulta) {
      if (errorConsulta.name === "AbortError") return;
      setErrorBusqueda(errorConsulta.message || "No se pudieron consultar los viajes.");
    } finally {
      if (!controlador.signal.aborted) setBuscando(false);
    }
  }

  function reintentarBusqueda() {
    if (destinoElegido) void buscarPorDestino(destinoElegido);
  }

  function seleccionarViaje(viaje) {
    setErrorAccion("");
    setViajeSeleccionado(viaje);
  }

  function volverALista() {
    setErrorAccion("");
    setViajeSeleccionado(null);
  }

  async function aceptarViaje(viaje, alAceptar) {
    setErrorAccion("");
    if (cargando || error) {
      setErrorAccion("Aún no se pudo validar el estado de tus viajes. Reintenta en un momento.");
      return;
    }
    if (String(viaje.id_usuario) === idUsuario) {
      setErrorAccion("No puedes aceptar un viaje que tú publicaste.");
      return;
    }
    if (viajePublicado) {
      setErrorAccion("Tienes un viaje publicado; no puedes aceptar otro viaje.");
      return;
    }
    if (viajeReservado) {
      setErrorAccion("Ya tienes un viaje en curso; finalízalo antes de aceptar otro.");
      return;
    }

    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Aceptar este viaje?",
      text: `${viaje.origen} → ${viaje.destino}`,
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar viaje",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setAceptandoId(viaje.id_viaje);
    try {
      const resultado = await leerJson(
        await fetch("/api/viajes/aceptar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_viaje: viaje.id_viaje }),
        }),
        "No se pudo aceptar el viaje.",
      );
      if (!resultado?.reserva) {
        throw new Error("La respuesta del servidor no confirmó la reserva.");
      }
      setViajeReservado(resultado.reserva);
      await Swal.fire({
        icon: "success",
        title: "Viaje aceptado",
        text: "Tu viaje ya está disponible en «En curso».",
        confirmButtonText: "Ver viaje",
      });
      alAceptar?.();
    } catch (errorAceptacion) {
      setErrorAccion(errorAceptacion.message || "No se pudo aceptar el viaje.");
    } finally {
      setAceptandoId(null);
    }
  }

  async function enviarSolicitud({ precio, fecha, hora, idRuta }) {
    setErrorSolicitud("");
    const invalido = validarSolicitud({ precio, fecha, hora, idRuta });
    if (invalido) {
      setErrorSolicitud(invalido);
      return false;
    }
    setEnviandoSolicitud(true);
    try {
      await leerJson(
        await fetch("/api/solicitudes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idRuta: Number(idRuta),
            fechaHora: combinarFechaHora(fecha, hora),
            horaLimite: null,
            presupuesto: Number(precio),
            compartir: false,
          }),
        }),
        "No se pudo registrar la solicitud.",
      );
      setSolicitudCreada(true);
      return true;
    } catch (errorEnvio) {
      setErrorSolicitud(errorEnvio.message || "No se pudo registrar la solicitud.");
      return false;
    } finally {
      setEnviandoSolicitud(false);
    }
  }

  function reintentar() {
    setCargando(true);
    setError("");
    setIntento((actual) => actual + 1);
  }

  return {
    idUsuario,
    viajePublicado,
    estadoVehiculo: estadoVehiculo.idUsuario === idUsuario
      ? estadoVehiculo.estado
      : "cargando",
    viajeReservado,
    cargando,
    error,
    reintentar,
    consulta,
    cambiarConsulta,
    sugerencias,
    destinoElegido,
    buscarPorDestino,
    reintentarBusqueda,
    resultados,
    buscando,
    errorBusqueda,
    viajeSeleccionado,
    seleccionarViaje,
    volverALista,
    calificaciones,
    aceptarViaje,
    aceptandoId,
    errorAccion,
    rutasDelDestino,
    enviarSolicitud,
    enviandoSolicitud,
    errorSolicitud,
    solicitudCreada,
  };
}
