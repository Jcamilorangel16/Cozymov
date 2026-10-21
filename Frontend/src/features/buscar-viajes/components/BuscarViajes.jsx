"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { puedeAceptarViaje } from "../../../validaciones/viajes";

function suscribirSesion() {
  return () => {};
}

function obtenerIdUsuario() {
  return window.sessionStorage.getItem("cozymov-usuario-id") || "";
}

async function consultarViajes(filtros, signal) {
  const parametros = new URLSearchParams();
  if (filtros.origen) parametros.set("origen", filtros.origen);
  if (filtros.destino) parametros.set("destino", filtros.destino);
  if (filtros.fecha) parametros.set("fecha", filtros.fecha);

  const respuesta = await fetch(`/api/viajes?${parametros.toString()}`, { signal });
  const resultado = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(resultado.error || "No se pudieron consultar los viajes.");
  }
  if (!Array.isArray(resultado.viajes)) {
    throw new Error("La respuesta del servidor no contiene una lista de viajes.");
  }

  return resultado.viajes;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function calcularDistancia(textoA, textoB) {
  const anterior = Array.from({ length: textoB.length + 1 }, (_, indice) => indice);

  for (let indiceA = 1; indiceA <= textoA.length; indiceA += 1) {
    let diagonal = anterior[0];
    anterior[0] = indiceA;

    for (let indiceB = 1; indiceB <= textoB.length; indiceB += 1) {
      const arriba = anterior[indiceB];
      const costo = textoA[indiceA - 1] === textoB[indiceB - 1] ? 0 : 1;
      anterior[indiceB] = Math.min(
        anterior[indiceB] + 1,
        anterior[indiceB - 1] + 1,
        diagonal + costo,
      );
      diagonal = arriba;
    }
  }

  return anterior[textoB.length];
}

function calcularSimilitud(consulta, valor) {
  const textoConsulta = normalizarTexto(consulta);
  const textoValor = normalizarTexto(valor);
  if (!textoConsulta || !textoValor) return 0;
  if (textoConsulta === textoValor) return 1;
  if (textoValor.includes(textoConsulta)) {
    return 0.8 + (textoConsulta.length / textoValor.length) * 0.2;
  }

  const candidatos = [textoValor, ...textoValor.split(" ")];
  return Math.max(
    ...candidatos.map((candidato) => {
      const longitud = Math.max(textoConsulta.length, candidato.length);
      return longitud ? 1 - calcularDistancia(textoConsulta, candidato) / longitud : 0;
    }),
  );
}

function puntajeViaje(viaje, filtros) {
  const puntajesTexto = [];
  if (filtros.origen) {
    puntajesTexto.push(calcularSimilitud(filtros.origen, viaje.origen));
  }
  if (filtros.destino) {
    puntajesTexto.push(calcularSimilitud(filtros.destino, viaje.destino));
  }

  const puntajeRuta = puntajesTexto.length
    ? puntajesTexto.reduce((total, puntaje) => total + puntaje, 0) / puntajesTexto.length
    : 0;
  const puntajeFecha =
    filtros.fecha && String(viaje.fecha_salida).slice(0, 10) === filtros.fecha ? 1 : 0;

  if (filtros.fecha && puntajesTexto.length) {
    return puntajeRuta * 0.8 + puntajeFecha * 0.2;
  }
  return filtros.fecha ? puntajeFecha : puntajeRuta;
}

function ordenarViajesPorSimilitud(viajes, filtros) {
  return viajes
    .map((viaje, indice) => ({ viaje, indice, puntaje: puntajeViaje(viaje, filtros) }))
    .sort((a, b) => b.puntaje - a.puntaje || a.indice - b.indice)
    .map(({ viaje }) => viaje);
}

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
  const [buscando, setBuscando] = useState(true);
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [error, setError] = useState("");
  const [tieneViajePublicado, setTieneViajePublicado] = useState(null);
  const [validacionCompletada, setValidacionCompletada] = useState(false);
  const idUsuario = useSyncExternalStore(
    suscribirSesion,
    obtenerIdUsuario,
    () => "",
  );

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
      fetch(`/api/viajes?id_usuario=${encodeURIComponent(idUsuario)}`, {
        signal: controlador.signal,
      })
        .then(async (respuesta) => {
          const resultado = await respuesta.json();
          if (!respuesta.ok) {
            throw new Error(resultado.error || "No se pudo validar tu viaje publicado.");
          }
          if (!("viaje" in resultado)) {
            throw new Error("No se pudo validar tu viaje publicado.");
          }
          setTieneViajePublicado(Boolean(resultado.viaje));
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
                        <div className="col-12 mt-2">
                          <button
                            className="btn btn-success"
                            type="button"
                            disabled={!puedeAceptarViaje(
                              idUsuario,
                              validacionCompletada,
                              tieneViajePublicado,
                            )}
                            title={
                              !idUsuario
                                ? "Inicia sesión para poder aceptar un viaje."
                                : tieneViajePublicado
                                  ? "Ya tienes un viaje publicado."
                                  : undefined
                            }
                          >
                            Aceptar viaje
                          </button>
                          {!idUsuario && (
                            <small className="texto-secundario ms-2">
                              Inicia sesión para poder aceptar un viaje.
                            </small>
                          )}
                          {tieneViajePublicado && (
                            <small className="texto-secundario ms-2">
                              Solo puedes aceptar un viaje si no tienes uno publicado.
                            </small>
                          )}
                          {idUsuario && !validacionCompletada && (
                            <small className="texto-secundario ms-2" role="status">
                              Validando tus viajes publicados...
                            </small>
                          )}
                        </div>
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
