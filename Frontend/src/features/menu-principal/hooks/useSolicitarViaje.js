// Estado del formulario «Solicitar un viaje»: ubicación sugerida, validación y envío.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { solicitudesPropiasPendientes } from "../../buscar-viajes/utils/solicitudes";
import {
  barrioMasCercano,
  cargarCoordenadasBarrios,
  coordenadaDeBarrio,
} from "../../../lib/mapa";
import {
  PRESUPUESTO_PREDETERMINADO,
  combinarFechaHora,
  fechaLocalISO,
  horaLocalHHmm,
  validarSolicitudViaje,
} from "../utils/destinosInicio";

/**
 * Coordina el formulario para solicitar un viaje.
 * El identificador del usuario no se envía: lo pone la ruta proxy desde la sesión.
 * @param {{destinoInicial?: string}} opciones Destino ya elegido en el buscador, si lo hay.
 * @returns Campos, estado de la ubicación y acción de envío.
 */
export function useSolicitarViaje({ destinoInicial = "" } = {}) {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState(destinoInicial);
  const [precio, setPrecio] = useState(String(PRESUPUESTO_PREDETERMINADO));
  // Fecha y hora actuales por defecto; el usuario puede cambiarlas.
  const [fecha, setFecha] = useState(() => fechaLocalISO());
  const [hora, setHora] = useState(() => horaLocalHHmm());
  // cargando → pidiendo GPS; sugerida → origen propuesto; manual → hay que elegirlo a mano.
  const [estadoUbicacion, setEstadoUbicacion] = useState("cargando");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [creada, setCreada] = useState(false);
  // Solo se permite una solicitud pendiente por pasajero: si ya tiene una, no se pide otra.
  const [solicitudPendiente, setSolicitudPendiente] = useState(null);
  const [verificandoPendiente, setVerificandoPendiente] = useState(true);
  const coordenadasRef = useRef({});
  const origenTocadoRef = useRef(false);

  // El estado inicial ya es «cargando»; quien reintente debe volver a ponerlo antes de llamar.
  const detectarUbicacion = useCallback(async (senal) => {
    let catalogo = {};
    try {
      catalogo = await cargarCoordenadasBarrios(senal);
      coordenadasRef.current = catalogo;
    } catch {
      coordenadasRef.current = {};
    }
    if (senal?.aborted) return;

    if (!navigator.geolocation || Object.keys(catalogo).length === 0) {
      setEstadoUbicacion("manual");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (senal?.aborted) return;
        const barrio = barrioMasCercano([coords.latitude, coords.longitude], catalogo);
        if (barrio && !origenTocadoRef.current) {
          setOrigen(barrio);
          setEstadoUbicacion("sugerida");
        } else {
          setEstadoUbicacion("manual");
        }
      },
      () => {
        if (!senal?.aborted) setEstadoUbicacion("manual");
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    // Se difiere un tick para no actualizar el estado dentro del cuerpo del efecto.
    void Promise.resolve().then(() => detectarUbicacion(controlador.signal));
    return () => controlador.abort();
  }, [detectarUbicacion]);

  // Si la consulta falla el formulario sigue disponible: el backend también rechaza la repetida.
  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/solicitudes", { cache: "no-store", signal: controlador.signal })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (respuesta.ok) {
          setSolicitudPendiente(solicitudesPropiasPendientes(datos)[0] ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controlador.signal.aborted) setVerificandoPendiente(false);
      });
    return () => controlador.abort();
  }, []);

  /**
   * Cambia el origen manualmente; deja de sobrescribirse con el GPS.
   * @param {string} barrio Barrio elegido.
   * @returns {void}
   */
  function cambiarOrigen(barrio) {
    origenTocadoRef.current = true;
    setError("");
    setEstadoUbicacion("manual");
    setOrigen(barrio);
  }

  function cambiarDestino(barrio) {
    setError("");
    setDestino(barrio);
  }

  /**
   * Valida y registra la solicitud con la API.
   * @returns {Promise<boolean>} true si quedó registrada.
   */
  async function enviar() {
    if (enviando || creada) return false;
    setError("");

    if (solicitudPendiente) {
      setError("Ya tienes una solicitud pendiente. Elimínala para poder pedir otra.");
      return false;
    }

    const invalido = validarSolicitudViaje({ origen, destino, precio, fecha, hora });
    if (invalido) {
      setError(invalido);
      return false;
    }

    setEnviando(true);
    try {
      const catalogo = coordenadasRef.current;
      const coordOrigen = coordenadaDeBarrio(origen, catalogo);
      const coordDestino = coordenadaDeBarrio(destino, catalogo);
      const respuesta = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen: origen.trim(),
          destino: destino.trim(),
          fechaHora: combinarFechaHora(fecha, hora),
          horaLimite: null,
          presupuesto: Number(precio),
          compartir: false,
          latOrigen: coordOrigen?.[0] ?? null,
          lonOrigen: coordOrigen?.[1] ?? null,
          latDestino: coordDestino?.[0] ?? null,
          lonDestino: coordDestino?.[1] ?? null,
        }),
      });

      const texto = await respuesta.text();
      let datos = null;
      try {
        datos = texto ? JSON.parse(texto) : null;
      } catch {
        datos = null;
      }
      if (!respuesta.ok) {
        throw new Error(datos?.error || "No se pudo registrar la solicitud.");
      }

      setCreada(true);
      return true;
    } catch (errorEnvio) {
      setError(errorEnvio.message || "No se pudo registrar la solicitud.");
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return {
    origen,
    destino,
    precio,
    fecha,
    hora,
    estadoUbicacion,
    enviando,
    error,
    creada,
    solicitudPendiente,
    verificandoPendiente,
    cambiarOrigen,
    cambiarDestino,
    setPrecio,
    setFecha,
    setHora,
    reintentarUbicacion: () => {
      setEstadoUbicacion("cargando");
      void detectarUbicacion();
    },
    enviar,
    minimoFecha: fechaLocalISO(),
  };
}
