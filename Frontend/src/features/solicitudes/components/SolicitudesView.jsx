"use client";

import { useEffect, useState } from "react";
import "../styles/solicitudes.css";
import { formatearFecha, formatearPrecio } from "../../buscar-viajes/utils/viajes";

const formularioInicial = {
  idRuta: "",
  fechaHora: "",
  horaLimite: "",
  presupuesto: "",
  compartir: false,
};

function fechaHoraLocal() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

async function leerRespuesta(respuesta, mensajePredeterminado) {
  const texto = await respuesta.text();
  const resultado = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new Error(resultado?.error || mensajePredeterminado);
  }
  return resultado;
}

function fechaVisible(valor) {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? formatearFecha(valor)
    : fecha.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default function SolicitudesView() {
  const [rutas, setRutas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [solicitudEditando, setSolicitudEditando] = useState(null);
  const [coincidencias, setCoincidencias] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [consultandoCoincidencias, setConsultandoCoincidencias] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarDatos() {
      try {
        const [respuestaRutas, respuestaSolicitudes] = await Promise.all([
          fetch("/api/rutas", { cache: "no-store", signal: controlador.signal }),
          fetch("/api/solicitudes", { cache: "no-store", signal: controlador.signal }),
        ]);
        const [datosRutas, datosSolicitudes] = await Promise.all([
          leerRespuesta(respuestaRutas, "No se pudieron consultar las rutas."),
          leerRespuesta(respuestaSolicitudes, "No se pudieron consultar tus solicitudes."),
        ]);
        if (!Array.isArray(datosRutas) || !Array.isArray(datosSolicitudes)) {
          throw new Error("La respuesta del servidor no contiene listas válidas.");
        }
        setRutas(datosRutas);
        setSolicitudes(datosSolicitudes);
        setError("");
      } catch (errorCarga) {
        if (errorCarga.name !== "AbortError") {
          setError(errorCarga.message || "No se pudieron cargar tus solicitudes.");
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    void cargarDatos();
    return () => controlador.abort();
  }, [intento]);

  function cambiarCampo(evento) {
    const { name, value, checked, type } = evento.target;
    setFormulario((actual) => ({
      ...actual,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
    setMensaje("");
  }

  function editarSolicitud(solicitud) {
    setSolicitudEditando(solicitud.idSolicitud);
    setFormulario({
      idRuta: String(solicitud.idRuta),
      fechaHora: String(solicitud.fechaHora || "").slice(0, 16),
      horaLimite: String(solicitud.horaLimite || "").slice(0, 5),
      presupuesto: solicitud.presupuesto == null ? "" : String(solicitud.presupuesto),
      compartir: solicitud.compartir === true,
    });
    setCoincidencias(null);
    setMensaje("");
  }

  function cancelarEdicion() {
    setSolicitudEditando(null);
    setFormulario({ ...formularioInicial, fechaHora: fechaHoraLocal() });
    setError("");
    setMensaje("");
  }

  async function guardarSolicitud(evento) {
    evento.preventDefault();
    if (guardando) return;

    const fechaHora = formulario.fechaHora;
    const presupuesto = formulario.presupuesto.trim();
    if (!formulario.idRuta || !fechaHora) {
      setError("Selecciona una ruta y la fecha y hora del viaje.");
      return;
    }
    if (presupuesto && (!Number.isFinite(Number(presupuesto)) || Number(presupuesto) < 0)) {
      setError("El presupuesto debe ser un número igual o mayor que cero.");
      return;
    }

    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const datos = {
        idRuta: Number(formulario.idRuta),
        fechaHora: `${fechaHora}:00`,
        horaLimite: formulario.horaLimite ? `${formulario.horaLimite}:00` : null,
        presupuesto: presupuesto ? Number(presupuesto) : null,
        compartir: formulario.compartir,
      };
      const respuesta = await fetch(
        solicitudEditando
          ? `/api/solicitudes?id=${encodeURIComponent(solicitudEditando)}`
          : "/api/solicitudes",
        {
          method: solicitudEditando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        },
      );
      await leerRespuesta(respuesta, "No se pudo guardar la solicitud.");
      setSolicitudEditando(null);
      setFormulario({ ...formularioInicial, fechaHora: fechaHoraLocal() });
      setCoincidencias(null);
      setMensaje(solicitudEditando ? "Solicitud actualizada." : "Solicitud creada.");
      setCargando(true);
      setIntento((actual) => actual + 1);
    } catch (errorGuardado) {
      setError(errorGuardado.message || "No se pudo guardar la solicitud.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarSolicitud(idSolicitud) {
    if (!window.confirm("¿Quieres eliminar esta solicitud?")) return;
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/solicitudes?id=${encodeURIComponent(idSolicitud)}`,
        { method: "DELETE" },
      );
      await leerRespuesta(respuesta, "No se pudo eliminar la solicitud.");
      if (solicitudEditando === idSolicitud) cancelarEdicion();
      if (coincidencias?.idSolicitud === idSolicitud) setCoincidencias(null);
      setSolicitudes((actuales) =>
        actuales.filter((solicitud) => solicitud.idSolicitud !== idSolicitud),
      );
      setMensaje("Solicitud eliminada.");
    } catch (errorEliminacion) {
      setError(errorEliminacion.message || "No se pudo eliminar la solicitud.");
    }
  }

  async function consultarCoincidencias(idSolicitud) {
    setConsultandoCoincidencias(true);
    setError("");
    try {
      const respuesta = await fetch(
        `/api/solicitudes?id=${encodeURIComponent(idSolicitud)}&coincidencias=1`,
        { cache: "no-store" },
      );
      const datos = await leerRespuesta(respuesta, "No se pudieron consultar los viajes coincidentes.");
      if (!Array.isArray(datos)) {
        throw new Error("La respuesta de coincidencias no es válida.");
      }
      setCoincidencias({ idSolicitud, viajes: datos });
    } catch (errorCoincidencias) {
      setError(errorCoincidencias.message || "No se pudieron consultar las coincidencias.");
    } finally {
      setConsultandoCoincidencias(false);
    }
  }

  function nombreRuta(idRuta) {
    const ruta = rutas.find((item) => Number(item.idRuta) === Number(idRuta));
    return ruta ? `${ruta.origen} → ${ruta.destino}` : `Ruta #${idRuta}`;
  }

  if (cargando && !solicitudes.length && !rutas.length) {
    return <p role="status">Cargando rutas y solicitudes...</p>;
  }

  return (
    <section className="solicitudes-view">
      <div className="mb-4">
        <h3 className="letra-contenido titulo-icono"><i className="bi bi-hand-index-thumb-fill" aria-hidden="true" /> Solicitar un viaje</h3>
        <p className="texto-secundario">
          Publica la ruta y el horario que necesitas; consulta viajes que coincidan.
        </p>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

      <form className="panel-lateral mb-4" onSubmit={guardarSolicitud}>
        <h4 className="h5 letra-contenido">
          {solicitudEditando ? "Editar solicitud" : "Nueva solicitud"}
        </h4>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="solicitud-ruta">Ruta</label>
            <select
              id="solicitud-ruta"
              name="idRuta"
              className="form-select"
              value={formulario.idRuta}
              onChange={cambiarCampo}
              required
            >
              <option value="">Selecciona una ruta</option>
              {rutas.map((ruta) => (
                <option key={ruta.idRuta} value={ruta.idRuta}>
                  {ruta.origen} → {ruta.destino}
                </option>
              ))}
            </select>
            {!rutas.length && (
              <small className="text-muted">No hay rutas registradas para seleccionar.</small>
            )}
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="solicitud-fecha">Fecha y hora</label>
            <input
              id="solicitud-fecha"
              name="fechaHora"
              type="datetime-local"
              className="form-control"
              value={formulario.fechaHora}
              onChange={cambiarCampo}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="solicitud-hora-limite">Hora límite (opcional)</label>
            <input
              id="solicitud-hora-limite"
              name="horaLimite"
              type="time"
              className="form-control"
              value={formulario.horaLimite}
              onChange={cambiarCampo}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="solicitud-presupuesto">Presupuesto máximo (COP)</label>
            <input
              id="solicitud-presupuesto"
              name="presupuesto"
              type="number"
              min="0"
              step="100"
              className="form-control"
              value={formulario.presupuesto}
              onChange={cambiarCampo}
              placeholder="Sin límite"
            />
          </div>
          <div className="col-md-4 d-flex align-items-end">
            <div className="form-check mb-2">
              <input
                id="solicitud-compartir"
                name="compartir"
                type="checkbox"
                className="form-check-input"
                checked={formulario.compartir}
                onChange={cambiarCampo}
              />
              <label className="form-check-label" htmlFor="solicitud-compartir">
                Acepto compartir el viaje
              </label>
            </div>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-primary" disabled={guardando || !rutas.length}>
            {guardando ? "Guardando..." : solicitudEditando ? "Guardar cambios" : "Publicar solicitud"}
          </button>
          {solicitudEditando && (
            <button type="button" className="btn btn-outline-secondary" onClick={cancelarEdicion}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <div>
        <h4 className="h5 letra-contenido mb-3 titulo-icono"><i className="bi bi-card-checklist" aria-hidden="true" /> Mis solicitudes</h4>
        {cargando ? (
          <p role="status">Actualizando tus solicitudes...</p>
        ) : solicitudes.length === 0 ? (
          <p className="texto-secundario">Todavía no tienes solicitudes publicadas.</p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {solicitudes.map((solicitud) => (
              <article className="panel-lateral" key={solicitud.idSolicitud}>
                <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                  <div>
                    <h5 className="letra-contenido mb-1">{nombreRuta(solicitud.idRuta)}</h5>
                    <p className="mb-1">
                      Salida: <strong>{fechaVisible(solicitud.fechaHora)}</strong>
                      {solicitud.horaLimite && ` · Hora límite ${String(solicitud.horaLimite).slice(0, 5)}`}
                    </p>
                    <small className="text-muted">
                      {solicitud.presupuesto == null
                        ? "Sin presupuesto máximo"
                        : `Presupuesto: ${formatearPrecio(solicitud.presupuesto)}`}
                      {" · "}
                      {solicitud.compartir ? "Acepta compartir" : "No acepta compartir"}
                    </small>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      disabled={consultandoCoincidencias}
                      onClick={() => consultarCoincidencias(solicitud.idSolicitud)}
                    >
                      Ver coincidencias
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => editarSolicitud(solicitud)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => eliminarSolicitud(solicitud.idSolicitud)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {coincidencias?.idSolicitud === solicitud.idSolicitud && (
                  <div className="border-top mt-3 pt-3">
                    <h6 className="letra-contenido">Viajes coincidentes</h6>
                    {!coincidencias.viajes.length ? (
                      <p className="mb-0 text-muted">Aún no hay viajes disponibles para esta solicitud.</p>
                    ) : (
                      <ul className="list-group">
                        {coincidencias.viajes.map((viaje) => (
                          <li
                            className="list-group-item d-flex justify-content-between gap-3 flex-wrap"
                            key={viaje.idViaje}
                          >
                            <span>
                              Viaje #{viaje.idViaje} · {fechaVisible(viaje.fechaHoraSalida)}
                            </span>
                            <span>
                              {formatearPrecio(viaje.costo)} · {viaje.cuposDisponibles} cupos
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
