"use client";

import { useState } from "react";

function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(precio));
}

function formatearFecha(fecha) {
  const valor = String(fecha || "").slice(0, 10);
  const fechaLocal = new Date(`${valor}T00:00:00`);
  return Number.isNaN(fechaLocal.getTime())
    ? valor
    : fechaLocal.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export default function BuscarViajes() {
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [fecha, setFecha] = useState("");
  const [viajes, setViajes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState("");

  async function handleBuscar(evento) {
    evento.preventDefault();
    setBuscando(true);
    setBusquedaRealizada(false);
    setError("");
    setViajes([]);

    const parametros = new URLSearchParams();
    if (origen.trim()) parametros.set("origen", origen.trim());
    if (destino.trim()) parametros.set("destino", destino.trim());
    if (fecha) parametros.set("fecha", fecha);

    try {
      const respuesta = await fetch(`/api/viajes?${parametros.toString()}`);
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudieron consultar los viajes.");
      }
      if (!Array.isArray(resultado.viajes)) {
        throw new Error("La respuesta del servidor no contiene una lista de viajes.");
      }

      setViajes(resultado.viajes);
      setBusquedaRealizada(true);
    } catch (errorConsulta) {
      setError(errorConsulta.message || "No se pudieron consultar los viajes.");
    } finally {
      setBuscando(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="card shadow-lg border-0 rounded-4">
        <div className="card-body p-4">
          <h2 className="text-center mb-4"> Buscar Viajes</h2>

          <form onSubmit={handleBuscar}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-origen">Origen</label>
                <input
                  id="buscar-origen"
                  type="text"
                  className="form-control"
                  placeholder="Cualquier origen"
                  maxLength={150}
                  value={origen}
                  onChange={(evento) => setOrigen(evento.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-destino">Destino</label>
                <input
                  id="buscar-destino"
                  type="text"
                  className="form-control"
                  placeholder="Cualquier destino"
                  maxLength={150}
                  value={destino}
                  onChange={(evento) => setDestino(evento.target.value)}
                />
              </div>

              <div className="col-md-4">
                <label className="form-label" htmlFor="buscar-fecha">Fecha de salida</label>
                <input
                  id="buscar-fecha"
                  type="date"
                  className="form-control"
                  value={fecha}
                  onChange={(evento) => setFecha(evento.target.value)}
                />
              </div>
            </div>

            <div className="d-grid mt-4">
              <button className="btn btn-primary btn-lg" type="submit" disabled={buscando}>
                {buscando ? "Buscando..." : "Buscar Viajes"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <section className="mt-4" aria-live="polite">
        {buscando && <p className="text-center" role="status">Consultando viajes...</p>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        {busquedaRealizada && (
          <>
            <h3 className="h5 mb-3">
              {viajes.length} {viajes.length === 1 ? "viaje encontrado" : "viajes encontrados"}
            </h3>
            {viajes.length === 0 ? (
              <p className="texto-secundario">No se encontraron viajes activos con esos filtros.</p>
            ) : (
              <div className="d-flex flex-column gap-3">
                {viajes.map((viaje) => (
                  <article className="card color-card border-0 shadow-sm" key={viaje.id_viaje}>
                    <div className="card-body">
                      <div className="d-flex flex-wrap justify-content-between gap-2">
                        <h4 className="h5 mb-1">
                          {viaje.origen} <span aria-hidden="true">→</span> {viaje.destino}
                        </h4>
                        <strong>{formatearPrecio(viaje.precio_pasaje)}</strong>
                      </div>
                      <p className="texto-secundario mb-3">
                        Conductor: {[viaje.primer_nombre, viaje.primer_apellido]
                          .filter(Boolean)
                          .join(" ") || "No disponible"}
                      </p>
                      <div className="row g-2">
                        <div className="col-sm-6">
                          <strong>Salida:</strong> {formatearFecha(viaje.fecha_salida)}
                          {viaje.hora_salida && ` · ${String(viaje.hora_salida).slice(0, 5)}`}
                        </div>
                        <div className="col-sm-6">
                          <strong>Punto de encuentro:</strong> {viaje.punto_encuentro}
                        </div>
                        <div className="col-sm-6">
                          <strong>Cupos disponibles:</strong> {viaje.cupos_disponibles}
                        </div>
                        {viaje.informacion_adicional && (
                          <div className="col-12">
                            <strong>Información adicional:</strong> {viaje.informacion_adicional}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
