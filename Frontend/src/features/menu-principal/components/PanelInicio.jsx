"use client";

// Busca viajes por destino y permite aceptarlos o solicitar uno nuevo.
import { useId, useState } from "react";
import Swal from "sweetalert2";
import { usePanelInicio } from "../hooks/usePanelInicio";
import { normalizarDestino } from "../utils/destinosInicio";
import SolicitarViajeInicio from "./SolicitarViajeInicio";
import SugerenciasDestinoInicio from "./SugerenciasDestinoInicio";
import TarjetaViajeResumenInicio from "./TarjetaViajeResumenInicio";
import ViajeEncontradoInicio from "./ViajeEncontradoInicio";

/**
 * Renderiza el resumen inicial del menú principal.
 * @param {{onNavigate: (id: string) => void}} props Acción para abrir otra sección.
 * @returns Panel de inicio.
 */
export default function PanelInicio({ onNavigate }) {
  const {
    idUsuario,
    viajePublicado,
    estadoVehiculo,
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
  } = usePanelInicio();
  const idSugerencias = useId();
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [aviso, setAviso] = useState("");
  // Se abre cuando el usuario dice que ningún viaje publicado le sirve.
  const [solicitudAbierta, setSolicitudAbierta] = useState(false);
  // Se abre con el botón «Pedir viaje» de la barra superior.
  const [pedirViajeAbierto, setPedirViajeAbierto] = useState(false);

  const mostrarBotonConductor =
    !cargando &&
    estadoVehiculo !== "cargando" &&
    !(estadoVehiculo === "registrado" && viajePublicado);
  const listaAbierta = sugerencias.length > 0;
  const hayBusqueda = destinoElegido !== null;

  async function confirmarSerConductor() {
    const confirmacion = await Swal.fire({
      title: "¿Estás seguro de que quieres ser conductor?",
      text: "Para continuar, registra tu vehículo y publica una ruta.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí",
      cancelButtonText: "No",
    });

    if (confirmacion.isConfirmed) {
      onNavigate("ofrecer");
    }
  }

  function elegirDestino(destino) {
    setIndiceActivo(-1);
    setAviso("");
    setSolicitudAbierta(false);
    void buscarPorDestino(destino);
  }

  function enviarBusqueda(evento) {
    evento.preventDefault();
    if (indiceActivo >= 0 && sugerencias[indiceActivo]) {
      elegirDestino(sugerencias[indiceActivo]);
      return;
    }
    if (hayBusqueda) {
      reintentarBusqueda();
      return;
    }
    const clave = normalizarDestino(consulta);
    const coincidencia =
      sugerencias.find((destino) => normalizarDestino(destino) === clave) || sugerencias[0];
    if (coincidencia) elegirDestino(coincidencia);
    else if (clave) setAviso("Elige un destino de la lista de sugerencias.");
  }

  function manejarTeclas(evento) {
    if (!listaAbierta) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceActivo((actual) => (actual + 1) % sugerencias.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((actual) => (actual <= 0 ? sugerencias.length - 1 : actual - 1));
    } else if (evento.key === "Escape") {
      setIndiceActivo(-1);
      cambiarConsulta("");
    }
  }

  function aceptar(viaje) {
    void aceptarViaje(viaje, () => onNavigate("en-curso"));
  }

  if (!idUsuario) {
    return (
      <div className="alert alert-warning" role="alert">
        Inicia sesión para consultar los viajes disponibles y tu actividad.
      </div>
    );
  }

  return (
    <div className="vista">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <button
          type="button"
          className="btn btn-success"
          aria-expanded={pedirViajeAbierto}
          onClick={() => setPedirViajeAbierto((abierto) => !abierto)}
        >
          Pedir viaje
        </button>
        {mostrarBotonConductor && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={confirmarSerConductor}
          >
            Quiero ser conductor
          </button>
        )}
      </div>

      <div className="mx-auto" style={{ maxWidth: 640 }}>
        {!cargando && error && (
          <div className="alert alert-danger" role="alert">
            <p className="mb-2">{error}</p>
            <button type="button" className="btn btn-outline-danger" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        )}

        {pedirViajeAbierto && (
          <div className="mb-4">
            <SolicitarViajeInicio
              key={`pedir-${destinoElegido ?? ""}`}
              destinoInicial={destinoElegido ?? ""}
              onVerSolicitudes={() => onNavigate("buscar")}
              onCerrar={() => setPedirViajeAbierto(false)}
            />
          </div>
        )}

        <section className="mb-4 inicio-buscador">
          <form className="input-group" onSubmit={enviarBusqueda} role="search">
            <button
              type="submit"
              className="input-group-text"
              aria-label="Buscar viajes"
              disabled={!consulta.trim() || buscando}
            >
              🔍
            </button>
            <input
              type="text"
              className="form-control"
              placeholder="¿A dónde quieres ir?"
              aria-label="Destino del viaje"
              role="combobox"
              aria-expanded={listaAbierta}
              aria-controls={idSugerencias}
              aria-autocomplete="list"
              aria-activedescendant={
                listaAbierta && indiceActivo >= 0
                  ? `${idSugerencias}-opcion-${indiceActivo}`
                  : undefined
              }
              autoComplete="off"
              value={consulta}
              onChange={(evento) => {
                setIndiceActivo(-1);
                setAviso("");
                cambiarConsulta(evento.target.value);
              }}
              onKeyDown={manejarTeclas}
            />
          </form>
          <SugerenciasDestinoInicio
            id={idSugerencias}
            sugerencias={sugerencias}
            indiceActivo={indiceActivo}
            onElegir={elegirDestino}
          />
          {aviso && (
            <p className="texto-secundario small mt-2" role="status">
              {aviso}
            </p>
          )}
        </section>

        {hayBusqueda && (
          <div aria-live="polite">
            {buscando ? (
              <p role="status">Buscando viajes a {destinoElegido}...</p>
            ) : errorBusqueda ? (
              <div className="alert alert-danger" role="alert">
                <p className="mb-2">{errorBusqueda}</p>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={reintentarBusqueda}
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <>
                {errorAccion && (
                  <div className="alert alert-danger" role="alert">
                    {errorAccion}
                  </div>
                )}

                {viajeSeleccionado ? (
                  <ViajeEncontradoInicio
                    viaje={viajeSeleccionado}
                    calificacion={calificaciones[String(viajeSeleccionado.id_usuario)]}
                    aceptando={aceptandoId === viajeSeleccionado.id_viaje}
                    onAceptar={() => aceptar(viajeSeleccionado)}
                    onVolver={resultados.length > 1 ? volverALista : undefined}
                  />
                ) : resultados.length >= 2 ? (
                  <section aria-label={`Viajes disponibles a ${destinoElegido}`}>
                    <p className="letra-contenido fw-semibold">
                      {resultados.length} viajes disponibles a {destinoElegido}
                    </p>
                    <div className="inicio-lista d-flex flex-column gap-3" tabIndex={0}>
                      {resultados.map((viaje) => (
                        <TarjetaViajeResumenInicio
                          key={viaje.id_viaje}
                          viaje={viaje}
                          calificacion={calificaciones[String(viaje.id_usuario)]}
                          aceptando={aceptandoId === viaje.id_viaje}
                          onSeleccionar={() => seleccionarViaje(viaje)}
                          onAceptar={() => aceptar(viaje)}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                {resultados.length === 0 ? (
                  <>
                    <p className="letra-contenido fw-semibold">
                      No se encontraron viajes disponibles a {destinoElegido}.
                    </p>
                    {!pedirViajeAbierto && (
                      <SolicitarViajeInicio
                        key={destinoElegido}
                        destinoInicial={destinoElegido}
                        onVerSolicitudes={() => onNavigate("buscar")}
                      />
                    )}
                  </>
                ) : pedirViajeAbierto ? null : solicitudAbierta ? (
                  <div className="mt-3">
                    <SolicitarViajeInicio
                      key={destinoElegido}
                      destinoInicial={destinoElegido}
                      onVerSolicitudes={() => onNavigate("buscar")}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline-primary mt-3"
                    onClick={() => setSolicitudAbierta(true)}
                  >
                    Ninguno me sirve: solicitar un viaje
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
