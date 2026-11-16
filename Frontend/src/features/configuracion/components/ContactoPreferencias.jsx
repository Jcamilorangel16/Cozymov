"use client";

import { useEffect, useState } from "react";

const preferenciasIniciales = {
  prioridadCosto: "",
  prioridadTiempo: "",
  preferirCompartir: "",
};

async function leerRespuesta(respuesta, mensajePredeterminado) {
  const texto = await respuesta.text();
  const resultado = texto ? JSON.parse(texto) : null;
  if (!respuesta.ok) {
    throw new Error(resultado?.error || mensajePredeterminado);
  }
  return resultado;
}

export default function ContactoPreferencias() {
  const [preferencias, setPreferencias] = useState(preferenciasIniciales);
  const [telefonos, setTelefonos] = useState([]);
  const [telefono, setTelefono] = useState("");
  const [telefonoEditando, setTelefonoEditando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardandoPreferencias, setGuardandoPreferencias] = useState(false);
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarDatos() {
      try {
        const [respuestaPreferencias, respuestaTelefonos] = await Promise.all([
          fetch("/api/preferencias", { cache: "no-store", signal: controlador.signal }),
          fetch("/api/telefonos", { cache: "no-store", signal: controlador.signal }),
        ]);
        const datosTelefonos = await leerRespuesta(
          respuestaTelefonos,
          "No se pudieron cargar tus teléfonos.",
        );
        if (!Array.isArray(datosTelefonos)) {
          throw new Error("La respuesta de teléfonos no es válida.");
        }

        let datosPreferencias = preferenciasIniciales;
        if (respuestaPreferencias.status !== 404) {
          const resultado = await leerRespuesta(
            respuestaPreferencias,
            "No se pudieron cargar tus preferencias.",
          );
          datosPreferencias = {
            prioridadCosto: resultado.prioridadCosto == null ? "" : String(resultado.prioridadCosto),
            prioridadTiempo: resultado.prioridadTiempo == null ? "" : String(resultado.prioridadTiempo),
            preferirCompartir: resultado.preferirCompartir == null
              ? ""
              : String(resultado.preferirCompartir),
          };
        }

        setPreferencias(datosPreferencias);
        setTelefonos(datosTelefonos);
        setError("");
      } catch (errorCarga) {
        if (errorCarga.name !== "AbortError") {
          setError(errorCarga.message || "No se pudieron cargar tus datos de contacto.");
        }
      } finally {
        if (!controlador.signal.aborted) setCargando(false);
      }
    }

    void cargarDatos();
    return () => controlador.abort();
  }, [intento]);

  async function guardarPreferencias(evento) {
    evento.preventDefault();
    setGuardandoPreferencias(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch("/api/preferencias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prioridadCosto: preferencias.prioridadCosto ? Number(preferencias.prioridadCosto) : null,
          prioridadTiempo: preferencias.prioridadTiempo ? Number(preferencias.prioridadTiempo) : null,
          preferirCompartir: preferencias.preferirCompartir === ""
            ? null
            : preferencias.preferirCompartir === "true",
        }),
      });
      const resultado = await leerRespuesta(respuesta, "No se pudieron guardar tus preferencias.");
      setPreferencias({
        prioridadCosto: resultado.prioridadCosto == null ? "" : String(resultado.prioridadCosto),
        prioridadTiempo: resultado.prioridadTiempo == null ? "" : String(resultado.prioridadTiempo),
        preferirCompartir: resultado.preferirCompartir == null
          ? ""
          : String(resultado.preferirCompartir),
      });
      setMensaje("Preferencias guardadas.");
    } catch (errorGuardado) {
      setError(errorGuardado.message || "No se pudieron guardar tus preferencias.");
    } finally {
      setGuardandoPreferencias(false);
    }
  }

  async function eliminarPreferencias() {
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch("/api/preferencias", { method: "DELETE" });
      if (respuesta.status !== 404) {
        await leerRespuesta(respuesta, "No se pudieron eliminar tus preferencias.");
      }
      setPreferencias(preferenciasIniciales);
      setMensaje("Preferencias eliminadas.");
    } catch (errorEliminacion) {
      setError(errorEliminacion.message || "No se pudieron eliminar tus preferencias.");
    }
  }

  async function guardarTelefono(evento) {
    evento.preventDefault();
    const numero = telefono.trim();
    if (
      !/^\+?[0-9 ]+$/.test(numero) ||
      numero.replace(/\D/g, "").length < 7 ||
      numero.length > 20
    ) {
      setError("Escribe un teléfono válido: de 7 a 20 caracteres, solo números, espacios y + inicial.");
      return;
    }

    setGuardandoTelefono(true);
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        telefonoEditando
          ? `/api/telefonos?id=${encodeURIComponent(telefonoEditando)}`
          : "/api/telefonos",
        {
          method: telefonoEditando ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefono: numero }),
        },
      );
      await leerRespuesta(respuesta, "No se pudo guardar el teléfono.");
      setTelefono("");
      setTelefonoEditando(null);
      setMensaje(telefonoEditando ? "Teléfono actualizado." : "Teléfono agregado.");
      setCargando(true);
      setIntento((actual) => actual + 1);
    } catch (errorGuardado) {
      setError(errorGuardado.message || "No se pudo guardar el teléfono.");
    } finally {
      setGuardandoTelefono(false);
    }
  }

  async function eliminarTelefono(idTelefono) {
    setError("");
    setMensaje("");
    try {
      const respuesta = await fetch(
        `/api/telefonos?id=${encodeURIComponent(idTelefono)}`,
        { method: "DELETE" },
      );
      await leerRespuesta(respuesta, "No se pudo eliminar el teléfono.");
      setTelefonos((actuales) =>
        actuales.filter((item) => item.idTelefono !== idTelefono),
      );
      if (telefonoEditando === idTelefono) {
        setTelefonoEditando(null);
        setTelefono("");
      }
      setMensaje("Teléfono eliminado.");
    } catch (errorEliminacion) {
      setError(errorEliminacion.message || "No se pudo eliminar el teléfono.");
    }
  }

  function editarTelefono(item) {
    setTelefonoEditando(item.idTelefono);
    setTelefono(item.telefono);
    setError("");
    setMensaje("");
  }

  if (cargando) {
    return <p role="status">Cargando teléfonos y preferencias...</p>;
  }

  return (
    <div>
      <h5 className="config-titulo">Contacto y preferencias</h5>
      <p className="config-ayuda">
        Administra tus teléfonos y cómo priorizar costo, tiempo y viajes compartidos.
      </p>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}

      <form onSubmit={guardarPreferencias} className="mb-4">
        <h6 className="letra-contenido fw-bold">Preferencias de movilidad</h6>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="prioridad-costo">Prioridad del costo</label>
            <select
              id="prioridad-costo"
              className="form-select"
              value={preferencias.prioridadCosto}
              onChange={(evento) => setPreferencias((actual) => ({
                ...actual,
                prioridadCosto: evento.target.value,
              }))}
            >
              <option value="">Sin preferencia</option>
              {[1, 2, 3, 4, 5].map((valor) => (
                <option key={valor} value={valor}>{valor} / 5</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="prioridad-tiempo">Prioridad del tiempo</label>
            <select
              id="prioridad-tiempo"
              className="form-select"
              value={preferencias.prioridadTiempo}
              onChange={(evento) => setPreferencias((actual) => ({
                ...actual,
                prioridadTiempo: evento.target.value,
              }))}
            >
              <option value="">Sin preferencia</option>
              {[1, 2, 3, 4, 5].map((valor) => (
                <option key={valor} value={valor}>{valor} / 5</option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="preferir-compartir">¿Prefieres compartir el viaje?</label>
            <select
              id="preferir-compartir"
              className="form-select"
              value={preferencias.preferirCompartir}
              onChange={(evento) => setPreferencias((actual) => ({
                ...actual,
                preferirCompartir: evento.target.value,
              }))}
            >
              <option value="">Sin preferencia</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
        <div className="d-flex gap-2 mt-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={guardandoPreferencias}
          >
            {guardandoPreferencias ? "Guardando..." : "Guardar preferencias"}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={eliminarPreferencias}>
            Borrar preferencias
          </button>
        </div>
      </form>

      <hr />

      <h6 className="letra-contenido fw-bold">Teléfonos de contacto</h6>
      {telefonos.length === 0 ? (
        <p className="text-muted">Aún no tienes teléfonos registrados.</p>
      ) : (
        <ul className="list-group mb-3">
          {telefonos.map((item) => (
            <li
              key={item.idTelefono}
              className="list-group-item d-flex justify-content-between align-items-center gap-2"
            >
              <span>{item.telefono}</span>
              <span className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => editarTelefono(item)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => eliminarTelefono(item.idTelefono)}
                >
                  Eliminar
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={guardarTelefono}>
        <label className="form-label" htmlFor="telefono">
          {telefonoEditando ? "Editar teléfono" : "Agregar teléfono"}
        </label>
        <div className="input-group">
          <input
            id="telefono"
            type="tel"
            className="form-control"
            value={telefono}
            onChange={(evento) => setTelefono(evento.target.value)}
            maxLength={20}
            autoComplete="tel"
            placeholder="+57 300 123 4567"
            required
          />
          <button type="submit" className="btn btn-outline-primary" disabled={guardandoTelefono}>
            {guardandoTelefono ? "Guardando..." : telefonoEditando ? "Actualizar" : "Agregar"}
          </button>
          {telefonoEditando && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setTelefonoEditando(null);
                setTelefono("");
              }}
            >
              Cancelar
            </button>
          )}
        </div>
        <small className="form-text text-muted">7–20 caracteres: números, espacios y + inicial.</small>
      </form>
    </div>
  );
}
