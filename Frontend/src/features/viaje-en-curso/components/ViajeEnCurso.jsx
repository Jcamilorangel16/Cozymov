"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { formatearFecha, formatearPrecioViaje } from "../../buscar-viajes/utils/viajes";
import { viajeEnTrayecto } from "../utils/trayecto";
import { textoCompartirViaje, urlCompartirWhatsApp } from "../utils/compartir";
import {
  borrarLlegada,
  debeAutofinalizar,
  guardarLlegada,
  leerLlegada,
  limiteAutofinalizar,
} from "../utils/llegada";
import "../styles/viaje-en-curso.css";

// Leaflet necesita `window`, por eso el mapa solo se carga en el navegador.
const MapaRuta = dynamic(() => import("./MapaRuta"), {
  ssr: false,
  loading: () => <div className="mapa-ruta mapa-cargando">Cargando mapa...</div>,
});

/**
 * Presenta la reserva activa del usuario.
 * @param {{onNavigate: (id: string) => void, onMensajeConductor?: (id: string, nombre: string) => void}} props
 * @returns Vista del viaje en curso o un estado de carga/error/vacío.
 */
export default function ViajeEnCurso({ onNavigate, onMensajeConductor }) {
  const [viaje, setViaje] = useState(null);
  // "pasajero" con reserva propia; "conductor" cuando atiende una solicitud que aceptó.
  const [rol, setRol] = useState("pasajero");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  const [cancelando, setCancelando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  // Evita dos finalizaciones a la vez (botón y GPS) mientras llega la respuesta de la primera.
  const finalizandoRef = useRef(false);
  // Se actualiza cada medio minuto: al llegar la hora de salida el viaje pasa a estar en trayecto.
  const [ahora, setAhora] = useState(() => Date.now());

  // Momento (ms) en que el GPS confirmó la llegada; desde ahí corre la hora para el cierre automático.
  const [llegada, setLlegada] = useState(null);
  // Comprobación del cierre automático; la ejecuta el reloj de medio minuto con los datos del último render.
  const alVencerLaHoraRef = useRef(null);

  useEffect(() => {
    const temporizador = setInterval(() => {
      setAhora(Date.now());
      alVencerLaHoraRef.current?.();
    }, 30_000);
    return () => clearInterval(temporizador);
  }, []);

  const idViaje = viaje?.id_viaje;
  const esPasajeroEnTrayecto = Boolean(viaje) && rol !== "conductor" && viajeEnTrayecto(viaje, new Date(ahora));

  // El navegador solo concede permiso de notificaciones tras un gesto: se pide en el primer toque.
  useEffect(() => {
    if (!esPasajeroEnTrayecto || typeof Notification === "undefined") return undefined;
    if (Notification.permission !== "default") return undefined;
    const pedir = () => void Notification.requestPermission();
    window.addEventListener("pointerdown", pedir, { once: true });
    return () => window.removeEventListener("pointerdown", pedir);
  }, [esPasajeroEnTrayecto]);

  /** Registra en la API que el pasajero terminó su viaje y lo quita de la vista. */
  async function registrarFinalizacion() {
    const respuesta = await fetch("/api/viajes/en-curso", { method: "POST" });
    const resultado = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(resultado.error || "No se pudo finalizar el viaje.");
    }
    borrarLlegada(window.localStorage, idViaje);
    setLlegada(null);
    setViaje(null);
  }

  /**
   * Finaliza el viaje y ofrece calificar al conductor.
   * @param {string} titulo Título del aviso de éxito.
   * @param {string} texto Texto del aviso de éxito.
   */
  async function finalizarYAvisar(titulo, texto) {
    if (finalizandoRef.current) return;
    finalizandoRef.current = true;
    setFinalizando(true);
    setError("");
    try {
      await registrarFinalizacion();
      Swal.close(); // cierra la ventana de llegada si seguía abierta
      const siguiente = await Swal.fire({
        icon: "success",
        title: titulo,
        text: texto,
        showCancelButton: true,
        confirmButtonText: "Calificar",
        cancelButtonText: "Más tarde",
      });
      if (siguiente.isConfirmed) onNavigate("calificaciones");
    } catch (errorFinalizacion) {
      // El botón «Finalizar viaje» sigue disponible como respaldo (y el cierre automático reintenta).
      finalizandoRef.current = false;
      setError(errorFinalizacion.message || "No se pudo finalizar el viaje.");
    } finally {
      setFinalizando(false);
    }
  }

  // Pasada una hora desde la llegada sin que el pasajero finalice, el viaje se finaliza solo.
  // Se revisa con el reloj de medio minuto: así también funciona al volver a abrir la página.
  useEffect(() => {
    alVencerLaHoraRef.current = () => {
      if (llegada === null || !debeAutofinalizar(llegada, Date.now())) return;
      void finalizarYAvisar(
        "Viaje finalizado",
        "Pasó una hora desde que llegaste a tu destino y finalizamos tu viaje automáticamente. ¿Quieres calificar a tu conductor ahora?",
      );
    };
  });

  /** El GPS confirmó la llegada: avisa con notificación y ventana emergente y arranca la hora de espera. */
  async function avisarLlegada() {
    if (finalizandoRef.current || llegada !== null) return;
    const momento = Date.now();
    guardarLlegada(window.localStorage, idViaje, momento);
    setLlegada(momento);

    const limite = new Date(limiteAutofinalizar(momento)).toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const destino = viaje.destino;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const notificacion = new Notification("Llegaste a tu destino", {
          body: `Llegaste a ${destino}. Finaliza tu viaje en Cozymov.`,
          tag: "cozymov-llegada",
        });
        notificacion.onclick = () => {
          window.focus();
          notificacion.close();
        };
      }
    } catch {
      // Algunos navegadores móviles no permiten construir Notification directamente.
    }

    const decision = await Swal.fire({
      icon: "success",
      title: "¡Llegaste a tu destino!",
      text: `Llegaste a ${destino}. Finaliza tu viaje; si no lo haces, se finalizará solo a las ${limite} (en 1 hora).`,
      showCancelButton: true,
      confirmButtonText: "Finalizar viaje",
      cancelButtonText: "Más tarde",
      reverseButtons: true,
      allowOutsideClick: false,
    });
    if (decision.isConfirmed) {
      await finalizarYAvisar("Viaje finalizado", "¿Quieres calificar a tu conductor ahora?");
    }
  }

  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/viajes/en-curso", { signal: controlador.signal })
      .then(async (respuesta) => {
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(resultado.error || "No se pudo consultar tu viaje en curso.");
        }
        if (!("viaje" in resultado)) {
          throw new Error("La respuesta del servidor no contiene tu viaje.");
        }
        setViaje(resultado.viaje);
        setRol(resultado.rol === "conductor" ? "conductor" : "pasajero");
        // Si el pasajero ya había llegado antes de recargar, retoma la hora de espera.
        setLlegada(
          resultado.viaje && resultado.rol !== "conductor"
            ? leerLlegada(window.localStorage, resultado.viaje.id_viaje)
            : null,
        );
      })
      .catch((errorConsulta) => {
        if (errorConsulta.name !== "AbortError") {
          setError(errorConsulta.message || "No se pudo consultar tu viaje en curso.");
        }
      })
      .finally(() => {
        if (!controlador.signal.aborted) setCargando(false);
      });

    return () => controlador.abort();
  }, [intento]);

  if (cargando) {
    return <p className="text-center py-5" role="status">Consultando tu viaje en curso...</p>;
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <p className="mb-2">{error}</p>
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={() => {
            setCargando(true);
            setError("");
            setIntento((actual) => actual + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!viaje) {
    return (
      <div className="text-center py-5">
        <h4 className="letra-contenido">No tienes un viaje en curso</h4>
        <p className="texto-secundario">Cuando aceptes un viaje, podrás consultarlo aquí.</p>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate("buscar")}>
          Buscar viaje
        </button>
      </div>
    );
  }

  const esConductor = rol === "conductor";
  // En trayecto el pasajero ya no puede salirse del viaje; solo finalizarlo.
  const enTrayecto = esPasajeroEnTrayecto;
  const horaLimite =
    llegada === null
      ? ""
      : new Date(limiteAutofinalizar(llegada)).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        });
  const nombreConductor = viaje.nombre_conductor || "No disponible";
  const nombrePasajero = viaje.nombre_pasajero || "No disponible";
  // Como conductor la contraparte es el pasajero que hizo la solicitud.
  const nombreContraparte = esConductor ? nombrePasajero : nombreConductor;
  const idContraparte = esConductor ? viaje.id_pasajero : viaje.id_usuario_conductor;
  const fechaSalida = viaje.fecha_salida
    ? `${formatearFecha(viaje.fecha_salida)}${viaje.hora_salida ? ` · ${viaje.hora_salida}` : ""}`
    : "No disponible";
  const estadoViaje = esConductor
    ? "Solicitud aceptada"
    : llegada !== null
      ? "Llegaste"
      : enTrayecto
        ? "En trayecto"
        : "Reserva confirmada";
  const enlaceWhatsApp = esConductor
    ? ""
    : urlCompartirWhatsApp(textoCompartirViaje(viaje, estadoViaje));
  const escribirAlConductor = () => {
    onMensajeConductor?.(String(idContraparte), nombreContraparte);
    onNavigate("mensajes");
  };

  async function salirDelViaje() {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Salir del viaje?",
      text: "Se cancelará tu reserva y el cupo quedará disponible para otra persona.",
      showCancelButton: true,
      confirmButtonText: "Sí, salir del viaje",
      cancelButtonText: "Seguir en el viaje",
      confirmButtonColor: "#dc3545",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setCancelando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/viajes/en-curso", { method: "DELETE" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo salir del viaje.");
      }

      setViaje(null);
      await Swal.fire({
        icon: "success",
        title: "Reserva cancelada",
        text: "Has salido del viaje y el cupo quedó disponible.",
      });
    } catch (errorCancelacion) {
      setError(errorCancelacion.message || "No se pudo salir del viaje.");
    } finally {
      setCancelando(false);
    }
  }

  async function cancelarComoConductor() {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Cancelar el viaje?",
      text: "El viaje se cancelará y la solicitud volverá a quedar disponible para otros conductores.",
      showCancelButton: true,
      confirmButtonText: "Sí, cancelar viaje",
      cancelButtonText: "Mantener el viaje",
      confirmButtonColor: "#dc3545",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;

    setCancelando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/viajes/en-curso?rol=conductor", { method: "DELETE" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo cancelar el viaje.");
      }

      setViaje(null);
      await Swal.fire({
        icon: "success",
        title: "Viaje cancelado",
        text: "El viaje se canceló y quedaste libre para atender otras solicitudes.",
      });
    } catch (errorCancelacion) {
      setError(errorCancelacion.message || "No se pudo cancelar el viaje.");
    } finally {
      setCancelando(false);
    }
  }

  async function finalizarViaje() {
    if (finalizandoRef.current) return;
    const confirmacion = await Swal.fire({
      icon: "question",
      title: "¿Finalizar el viaje?",
      text: "Confirma que ya llegaste a tu destino. Podrás calificar a tu conductor.",
      showCancelButton: true,
      confirmButtonText: "Sí, finalizar",
      cancelButtonText: "Todavía no",
      reverseButtons: true,
    });
    if (!confirmacion.isConfirmed) return;
    await finalizarYAvisar("Viaje finalizado", "¿Quieres calificar a tu conductor ahora?");
  }

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h3 className="mb-0 letra-contenido">
            {esConductor ? "Viaje que estás atendiendo" : "Tu viaje en curso"}
          </h3>
          <span className="estado-viaje">{estadoViaje}</span>
        </div>
        <section className="panel-lateral viaje-resumen-ruta">
          <small className="texto-secundario">Tu ruta</small>
          <h4 className="h3 letra-contenido mb-0">
            {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
          </h4>
          <p className="texto-secundario mt-3 mb-0">
            Salida: <strong>{fechaSalida}</strong>
          </p>
          <div className="mt-3">
            <MapaRuta
              key={`${viaje.origen}|${viaje.destino}`}
              origen={viaje.origen}
              destino={viaje.destino}
              // En trayecto, el GPS avisa la llegada y abre la ventana para finalizar el viaje.
              onLlegada={enTrayecto && llegada === null ? avisarLlegada : undefined}
            />
          </div>
        </section>
      </div>

      <div className="col-lg-4 d-flex flex-column gap-3">
        <section className="panel-lateral">
          <h5 className="letra-contenido fw-bold mb-3">
            {esConductor ? "Tu pasajero" : "Tu conductor"}
          </h5>
          <div className="d-flex align-items-center gap-3">
            <div className="conductor-avatar" aria-hidden="true">
              {nombreContraparte.charAt(0)}
            </div>
            <div className="fw-semibold letra-contenido">{nombreContraparte}</div>
          </div>
          <button type="button" className="btn btn-primary w-100 mt-3" onClick={escribirAlConductor}>
            💬 Enviar mensaje
          </button>

          {esConductor ? (
            <>
              <button
                type="button"
                className="btn btn-outline-danger w-100 mt-2"
                onClick={cancelarComoConductor}
                disabled={cancelando}
              >
                {cancelando ? "Cancelando viaje..." : "Cancelar viaje"}
              </button>
              <p className="texto-secundario small mt-3 mb-0">
                El pasajero finaliza el viaje al llegar a su destino; entonces podrá calificarte.
              </p>
            </>
          ) : (
            <>
              <a
                href={enlaceWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp w-100 mt-2"
                aria-label="Compartir la información del viaje por WhatsApp (se abre en otra pestaña)"
              >
                <i className="bi bi-whatsapp" aria-hidden="true" /> Compartir viaje por WhatsApp
              </a>
              <button
                type="button"
                className="btn btn-success w-100 mt-2"
                onClick={finalizarViaje}
                disabled={finalizando || cancelando}
              >
                {finalizando ? "Finalizando viaje..." : "Finalizar viaje"}
              </button>
              {enTrayecto ? (
                <>
                  <p className="texto-secundario small mt-3 mb-0" role="status">
                    El viaje ya está en trayecto: no puedes salirte.
                  </p>
                  <p className="texto-secundario small mt-2 mb-0">
                    <i className="bi bi-geo-alt-fill" aria-hidden="true" />{" "}
                    {llegada !== null
                      ? `Llegaste a ${viaje.destino}. Si no finalizas el viaje, se finalizará solo a las ${horaLimite}.`
                      : `Cuando tu GPS marque que llegaste a ${viaje.destino} te avisaremos para que finalices el viaje; si no lo haces, se finalizará solo una hora después.`}
                  </p>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline-danger w-100 mt-2"
                  onClick={salirDelViaje}
                  disabled={cancelando || finalizando}
                >
                  {cancelando ? "Cancelando reserva..." : "Salir del viaje"}
                </button>
              )}
            </>
          )}
          {error && <p className="alert alert-danger mt-3 mb-0" role="alert">{error}</p>}
        </section>

        <section className="panel-lateral">
          <h5 className="letra-contenido fw-bold mb-3">Datos de la ruta</h5>
          <dl className="datos-viaje mb-0">
            <dt>Origen</dt>
            <dd>{viaje.origen}</dd>
            <dt>Destino</dt>
            <dd>{viaje.destino}</dd>
            <dt>Salida</dt>
            <dd>{fechaSalida}</dd>
            <dt>Precio</dt>
            <dd>{formatearPrecioViaje(viaje.precio_pasaje)}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
