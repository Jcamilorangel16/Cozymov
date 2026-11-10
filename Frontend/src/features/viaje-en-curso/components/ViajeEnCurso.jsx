"use client";

import { useEffect, useState } from "react";
import { formatearFecha, formatearPrecio } from "../../buscar-viajes/utils/viajes";
import "../styles/viaje-en-curso.css";

/**
 * Presenta la reserva activa del usuario.
 * @param {{onNavigate: (id: string) => void, onMensajeConductor?: (id: string, nombre: string) => void}} props
 * @returns Vista del viaje en curso o un estado de carga/error/vacío.
 */
export default function ViajeEnCurso({ onNavigate, onMensajeConductor }) {
  const [viaje, setViaje] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

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

  const nombreConductor = viaje.nombre_conductor || "No disponible";
  const fechaSalida = viaje.fecha_salida
    ? `${formatearFecha(viaje.fecha_salida)}${viaje.hora_salida ? ` · ${viaje.hora_salida}` : ""}`
    : "No disponible";
  const escribirAlConductor = () => {
    onMensajeConductor?.(String(viaje.id_conductor), nombreConductor);
    onNavigate("mensajes");
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
          <h3 className="mb-0 letra-contenido">Tu viaje en curso</h3>
          <span className="estado-viaje">Reserva confirmada</span>
        </div>
        <section className="panel-lateral viaje-resumen-ruta">
          <small className="texto-secundario">Tu ruta</small>
          <h4 className="h3 letra-contenido mb-0">
            {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
          </h4>
          <p className="texto-secundario mt-3 mb-0">
            Salida: <strong>{fechaSalida}</strong>
          </p>
        </section>
      </div>

      <div className="col-lg-4 d-flex flex-column gap-3">
        <section className="panel-lateral">
          <h5 className="letra-contenido fw-bold mb-3">Tu conductor</h5>
          <div className="d-flex align-items-center gap-3">
            <div className="conductor-avatar" aria-hidden="true">
              {nombreConductor.charAt(0)}
            </div>
            <div className="fw-semibold letra-contenido">{nombreConductor}</div>
          </div>
          <button type="button" className="btn btn-primary w-100 mt-3" onClick={escribirAlConductor}>
            💬 Enviar mensaje
          </button>
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
