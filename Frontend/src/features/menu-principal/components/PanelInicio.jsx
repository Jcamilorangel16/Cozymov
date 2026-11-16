"use client";

// Muestra viajes disponibles y actividad real de la cuenta.
import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { formatearPrecio } from "../../buscar-viajes/utils/viajes";
import { usePanelInicio } from "../hooks/usePanelInicio";

/**
 * Renderiza el resumen inicial del menú principal.
 * @param {{onNavigate: (id: string) => void}} props Acción para abrir otra sección.
 * @returns Panel de inicio.
 */
export default function PanelInicio({ onNavigate }) {
  const {
    idUsuario,
    viajes,
    viajePublicado,
    estadoVehiculo,
    cargando,
    error,
    reintentar,
  } = usePanelInicio();
  const [origenFiltro, setOrigenFiltro] = useState("");
  const [origenBuscado, setOrigenBuscado] = useState(null);

  const viajesFiltrados = useMemo(() => {
    const origen = (origenBuscado || "").toLocaleLowerCase("es");
    if (!origen) return [];

    return viajes.filter((viaje) => (
      String(viaje.origen || "").toLocaleLowerCase("es").includes(origen)
    ));
  }, [viajes, origenBuscado]);
  const mostrarBotonConductor =
    !cargando &&
    estadoVehiculo !== "cargando" &&
    !(estadoVehiculo === "registrado" && viajePublicado);

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

  function buscarViajes(evento) {
    evento.preventDefault();
    const origen = origenFiltro.trim();
    if (origen) setOrigenBuscado(origen);
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
      <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mb-3">
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
        <section className="mb-4">
          <form className="input-group" onSubmit={buscarViajes}>
            <button
              type="submit"
              className="input-group-text"
              aria-label="Buscar viajes"
              disabled={!origenFiltro.trim()}
            >
              🔍
            </button>
            <input
              type="text"
              className="form-control"
              placeholder="¿A dónde quieres ir?"
              aria-label="Buscar viajes por origen"
              value={origenFiltro}
              onChange={(evento) => {
                setOrigenFiltro(evento.target.value);
                setOrigenBuscado(null);
              }}
            />
          </form>
        </section>

        {origenBuscado !== null && (cargando ? (
          <p role="status">Cargando viajes disponibles...</p>
        ) : error ? (
          <div className="alert alert-danger" role="alert">
            <p>{error}</p>
            <button type="button" className="btn btn-outline-danger" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        ) : viajesFiltrados.length === 0 ? (
          <p className="texto-secundario">
            No hay viajes disponibles con esos filtros.
          </p>
        ) : (
          <div className="d-flex flex-column gap-3">
            {viajesFiltrados.slice(0, 5).map((viaje) => (
              <article className="viaje-item" key={viaje.id_viaje}>
                <div className="viaje-info">
                  <div className="fw-semibold letra-contenido">
                    {viaje.origen} → {viaje.destino}
                  </div>
                  <span
                    className={`viaje-cupos${Number(viaje.cupos_disponibles) === 1 ? " viaje-cupos-ultimo" : ""}`}
                  >
                    {Number(viaje.cupos_disponibles) === 1
                      ? "Última plaza"
                      : `${viaje.cupos_disponibles} plazas libres`}
                  </span>
                  <small className="d-block texto-secundario">
                    {formatearPrecio(viaje.precio_pasaje)}
                  </small>
                </div>

                <button
                  type="button"
                  className="btn-reservar"
                  onClick={() => onNavigate("buscar")}
                >
                  Aceptar viaje
                </button>
              </article>
            ))}
          </div>
        ))}
        {origenBuscado !== null && !cargando && !error && viajesFiltrados.length > 5 && (
          <button
            type="button"
            className="btn btn-outline-primary mt-3"
            onClick={() => onNavigate("buscar")}
          >
            Ver todos los viajes
          </button>
        )}
      </div>

    </div>
  );
}