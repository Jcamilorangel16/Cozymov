"use client";

import { useEffect, useState } from "react";
import { useSessionUserId } from "../../../hooks/useSessionUserId";

async function leerRespuesta(respuesta, mensajePredeterminado) {
  const texto = await respuesta.text();
  const resultado = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new Error(resultado?.error || mensajePredeterminado);
  }
  return resultado;
}

function FormularioCalificacion({ viaje, guardando, onEnviar }) {
  const [puntuacion, setPuntuacion] = useState("5");
  const [comentario, setComentario] = useState("");
  const idCampo = `reserva-${viaje.id_reserva}`;

  function enviar(evento) {
    evento.preventDefault();
    onEnviar(viaje, Number(puntuacion), comentario.trim() || null);
  }

  return (
    <form onSubmit={enviar}>
      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label" htmlFor={`puntuacion-${idCampo}`}>Puntuación</label>
          <select
            id={`puntuacion-${idCampo}`}
            className="form-select"
            value={puntuacion}
            onChange={(evento) => setPuntuacion(evento.target.value)}
          >
            {[5, 4, 3, 2, 1].map((valor) => (
              <option key={valor} value={valor}>{valor} / 5</option>
            ))}
          </select>
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor={`comentario-${idCampo}`}>Comentario (opcional)</label>
          <textarea
            id={`comentario-${idCampo}`}
            className="form-control"
            rows={3}
            maxLength={500}
            value={comentario}
            onChange={(evento) => setComentario(evento.target.value)}
            placeholder="Cuéntanos cómo fue tu experiencia."
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary mt-3" disabled={guardando}>
        {guardando ? "Enviando..." : "Enviar calificación"}
      </button>
    </form>
  );
}

export default function CalificacionesView() {
  const idUsuario = useSessionUserId();
  const [recibidas, setRecibidas] = useState([]);
  const [emitidas, setEmitidas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [completados, setCompletados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!idUsuario) return undefined;
    const controlador = new AbortController();

    async function cargarCalificaciones() {
      try {
        const [respuestaRecibidas, respuestaEmitidas, respuestaResumen, respuestaViajes] =
          await Promise.all([
            fetch("/api/calificaciones", { cache: "no-store", signal: controlador.signal }),
            fetch("/api/calificaciones?emitidas=1", { cache: "no-store", signal: controlador.signal }),
            fetch(`/api/calificaciones?resumen=${encodeURIComponent(idUsuario)}`, {
              cache: "no-store",
              signal: controlador.signal,
            }),
            fetch("/api/viajes/completados", { cache: "no-store", signal: controlador.signal }),
          ]);
        const [datosRecibidas, datosEmitidas, datosResumen, datosViajes] = await Promise.all([
          leerRespuesta(respuestaRecibidas, "No se pudieron consultar las calificaciones recibidas."),
          leerRespuesta(respuestaEmitidas, "No se pudieron consultar tus calificaciones."),
          leerRespuesta(respuestaResumen, "No se pudo consultar el resumen de calificaciones."),
          leerRespuesta(respuestaViajes, "No se pudieron consultar tus viajes finalizados."),
        ]);
        if (
          !Array.isArray(datosRecibidas) ||
          !Array.isArray(datosEmitidas) ||
          !datosResumen ||
          typeof datosResumen !== "object" ||
          !Array.isArray(datosViajes?.viajes)
        ) {
          throw new Error("La respuesta del servidor no contiene datos de calificaciones válidos.");
        }

        setRecibidas(datosRecibidas);
        setEmitidas(datosEmitidas);
        setResumen(datosResumen);
        setCompletados(datosViajes.viajes);
        setError("");
      } catch (errorCarga) {
        if (errorCarga.name !== "AbortError") {
          setError(errorCarga.message || "No se pudieron cargar las calificaciones.");
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    void cargarCalificaciones();
    return () => controlador.abort();
  }, [idUsuario, intento]);

  const reservasCalificadas = new Set(emitidas.map((item) => Number(item.idReserva)));
  const pendientes = completados.filter(
    (viaje) => !reservasCalificadas.has(Number(viaje.id_reserva)),
  );

  async function enviarCalificacion(viaje, puntuacion, comentario) {
    const idReserva = Number(viaje.id_reserva);
    const idConductor = Number(viaje.id_usuario_conductor);
    if (!Number.isSafeInteger(idReserva) || idReserva <= 0 ||
      !Number.isSafeInteger(idConductor) || idConductor <= 0) {
      setError("No se pudieron identificar la reserva y el conductor.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch("/api/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idReserva, idEvaluado: idConductor, puntuacion, comentario }),
      });
      await leerRespuesta(respuesta, "No se pudo enviar la calificación.");
      setMensaje("Tu calificación fue registrada.");
      setCargando(true);
      setIntento((actual) => actual + 1);
    } catch (errorGuardado) {
      setError(errorGuardado.message || "No se pudo enviar la calificación.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCalificacion(idCalificacion) {
    if (!window.confirm("¿Quieres eliminar esta calificación?")) return;
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/calificaciones?id=${encodeURIComponent(idCalificacion)}`,
        { method: "DELETE" },
      );
      await leerRespuesta(respuesta, "No se pudo eliminar la calificación.");
      setMensaje("Calificación eliminada.");
      setCargando(true);
      setIntento((actual) => actual + 1);
    } catch (errorEliminacion) {
      setError(errorEliminacion.message || "No se pudo eliminar la calificación.");
    }
  }

  if (!idUsuario || cargando) {
    return <p role="status">Cargando calificaciones...</p>;
  }

  return (
    <section className="calificaciones-view">
      <h3 className="letra-contenido">Calificaciones</h3>
      <p className="texto-secundario">
        Consulta tu reputación y comparte cómo fue tu experiencia en viajes finalizados.
      </p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

      <div className="panel-lateral mb-4">
        <h4 className="h5 letra-contenido">Tu resumen</h4>
        <p className="mb-0">
          <strong>{resumen?.promedio == null ? "Sin calificaciones" : `${Number(resumen.promedio).toFixed(1)} / 5`}</strong>
          {" · "}
          {Number(resumen?.total || 0)} recibida(s)
        </p>
      </div>

      {pendientes.length === 0 ? (
        <p className="panel-lateral mb-4">
          No tienes viajes pendientes por calificar. Finaliza un viaje desde &quot;Viaje en curso&quot;
          para poder calificar a tu conductor.
        </p>
      ) : (
        pendientes.map((viaje) => (
          <div className="panel-lateral mb-4" key={viaje.id_reserva}>
            <h4 className="h5 letra-contenido">Calificar a {viaje.nombre_conductor}</h4>
            <p>
              Viaje {viaje.origen} → {viaje.destino}
              {viaje.fecha_hora_salida
                ? ` · ${new Date(viaje.fecha_hora_salida).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`
                : ""}
            </p>
            <FormularioCalificacion
              viaje={viaje}
              guardando={guardando}
              onEnviar={enviarCalificacion}
            />
          </div>
        ))
      )}

      <div className="row g-4">
        <div className="col-lg-6">
          <h4 className="h5 letra-contenido">Recibidas</h4>
          {recibidas.length === 0 ? (
            <p className="text-muted">Todavía no tienes calificaciones recibidas.</p>
          ) : (
            <ul className="list-group">
              {recibidas.map((item) => (
                <li className="list-group-item" key={item.idCalificacion}>
                  <strong>{item.puntuacion} / 5</strong>
                  <small className="d-block text-muted">Reserva #{item.idReserva}</small>
                  {item.comentario && <p className="mb-0 mt-2">{item.comentario}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="col-lg-6">
          <h4 className="h5 letra-contenido">Enviadas</h4>
          {emitidas.length === 0 ? (
            <p className="text-muted">Todavía no has enviado calificaciones.</p>
          ) : (
            <ul className="list-group">
              {emitidas.map((item) => (
                <li
                  className="list-group-item d-flex justify-content-between align-items-start gap-3"
                  key={item.idCalificacion}
                >
                  <span>
                    <strong>{item.puntuacion} / 5</strong>
                    <small className="d-block text-muted">
                      Reserva #{item.idReserva} · Usuario #{item.idEvaluado}
                    </small>
                    {item.comentario && <span className="d-block mt-2">{item.comentario}</span>}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => eliminarCalificacion(item.idCalificacion)}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
