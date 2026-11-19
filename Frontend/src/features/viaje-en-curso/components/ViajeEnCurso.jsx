"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { formatearFecha, formatearPrecio } from "../../buscar-viajes/utils/viajes";
import { viajeEnTrayecto } from "../utils/trayecto";
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
  // Se actualiza cada medio minuto: al llegar la hora de salida el viaje pasa a estar en trayecto.
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const temporizador = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(temporizador);
  }, []);

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
  const enTrayecto = !esConductor && viajeEnTrayecto(viaje, new Date(ahora));
  const nombreConductor = viaje.nombre_conductor || "No disponible";
  const nombrePasajero = viaje.nombre_pasajero || "No disponible";
  // Como conductor la contraparte es el pasajero que hizo la solicitud.
  const nombreContraparte = esConductor ? nombrePasajero : nombreConductor;
  const idContraparte = esConductor ? viaje.id_pasajero : viaje.id_usuario_conductor;
  const fechaSalida = viaje.fecha_salida
    ? `${formatearFecha(viaje.fecha_salida)}${viaje.hora_salida ? ` · ${viaje.hora_salida}` : ""}`
    : "No disponible";
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

    setFinalizando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/viajes/en-curso", { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo finalizar el viaje.");
      }

      setViaje(null);
      const siguiente = await Swal.fire({
        icon: "success",
        title: "Viaje finalizado",
        text: "¿Quieres calificar a tu conductor ahora?",
        showCancelButton: true,
        confirmButtonText: "Calificar",
        cancelButtonText: "Más tarde",
      });
      if (siguiente.isConfirmed) onNavigate("calificaciones");
    } catch (errorFinalizacion) {
      setError(errorFinalizacion.message || "No se pudo finalizar el viaje.");
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h3 className="mb-0 letra-contenido">
            {esConductor ? "Viaje que estás atendiendo" : "Tu viaje en curso"}
          </h3>
          <span className="estado-viaje">
            {esConductor ? "Solicitud aceptada" : enTrayecto ? "En trayecto" : "Reserva confirmada"}
          </span>
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
              <button
                type="button"
                className="btn btn-success w-100 mt-2"
                onClick={finalizarViaje}
                disabled={finalizando || cancelando}
              >
                {finalizando ? "Finalizando viaje..." : "Finalizar viaje"}
              </button>
              {enTrayecto ? (
                <p className="texto-secundario small mt-3 mb-0" role="status">
                  El viaje ya está en trayecto: no puedes salirte. Finalízalo cuando llegues a tu
                  destino.
                </p>
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
            <dd>{formatearPrecio(viaje.precio_pasaje)}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}
