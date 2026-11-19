"use client";

// Formulario de Inicio para pedir un viaje cuando ninguno de los publicados sirve.
import { useId } from "react";
import BarrioDropdown from "../../ofrecer-viajes/components/BarrioDropdown";
import barriosRutaCotidiana from "../../ofrecer-viajes/constants/barriosRutaCotidiana";
import { LUGARES_ADICIONALES } from "../../ofrecer-viajes/constants/ofrecerViajes";
import { useSolicitarViaje } from "../hooks/useSolicitarViaje";

const MENSAJE_UBICACION = {
  cargando: "Buscando tu ubicación para proponerte el origen...",
  sugerida: "Origen sugerido por tu ubicación actual. Puedes cambiarlo.",
  manual: "No pudimos obtener tu ubicación: elige el barrio de origen.",
};

/**
 * Permite registrar una solicitud de viaje con origen, destino, precio, fecha y hora.
 * @param {{destinoInicial?: string, sinViajes?: boolean, onVerSolicitudes?: () => void, onCerrar?: () => void}} props Destino preseleccionado, si aparece porque la búsqueda no encontró viajes, navegación opcional y cierre opcional del formulario.
 * @returns Formulario de solicitud de viaje.
 */
export default function SolicitarViajeInicio({
  destinoInicial = "",
  sinViajes = false,
  onVerSolicitudes,
  onCerrar,
}) {
  const id = useId();
  const {
    origen,
    destino,
    precio,
    fecha,
    hora,
    estadoUbicacion,
    enviando,
    error,
    creada,
    solicitudPendiente,
    verificandoPendiente,
    cambiarOrigen,
    cambiarDestino,
    setPrecio,
    setFecha,
    setHora,
    reintentarUbicacion,
    enviar,
    minimoFecha,
  } = useSolicitarViaje({ destinoInicial });

  function manejarEnvio(evento) {
    evento.preventDefault();
    void enviar();
  }

  if (creada) {
    return (
      <section className="viaje-item inicio-destacado" aria-labelledby={`${id}-titulo`}>
        <h2 className="h5 letra-contenido" id={`${id}-titulo`}>
          Solicitud enviada
        </h2>
        <div className="alert alert-success" role="status">
          Registramos tu solicitud de {origen} a {destino}. Un conductor con vehículo puede
          aceptarla desde «Buscar»; cuando lo haga, tu viaje aparecerá en «En curso».
        </div>
        <div className="d-flex flex-wrap gap-2">
          {onVerSolicitudes && (
            <button type="button" className="btn btn-outline-primary" onClick={onVerSolicitudes}>
              Ver mis solicitudes
            </button>
          )}
          {onCerrar && (
            <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
              Cerrar
            </button>
          )}
        </div>
      </section>
    );
  }

  if (verificandoPendiente) {
    return (
      <p className="texto-secundario" role="status">
        Comprobando tus solicitudes...
      </p>
    );
  }

  if (solicitudPendiente) {
    return (
      <section className="viaje-item inicio-destacado" aria-labelledby={`${id}-titulo`}>
        <h2 className="h5 letra-contenido" id={`${id}-titulo`}>
          Ya tienes una solicitud pendiente
        </h2>
        <div className="alert alert-success" role="status">
          Pediste un viaje de {solicitudPendiente.origen} a {solicitudPendiente.destino}. Solo
          puedes tener una solicitud a la vez: elimínala en «Buscar» o espera a que un
          conductor la acepte para pedir otra.
        </div>
        <div className="d-flex flex-wrap gap-2">
          {onVerSolicitudes && (
            <button type="button" className="btn btn-outline-primary" onClick={onVerSolicitudes}>
              Ver mi solicitud
            </button>
          )}
          {onCerrar && (
            <button type="button" className="btn btn-outline-secondary" onClick={onCerrar}>
              Cerrar
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="viaje-item inicio-destacado" aria-labelledby={`${id}-titulo`}>
      {sinViajes && destinoInicial ? (
        <>
          <div className="vacio-ilustracion" aria-hidden="true">
            <i className="bi bi-signpost-2-fill" />
            <i className="bi bi-emoji-neutral-fill" />
            <i className="bi bi-car-front" />
          </div>
          <h2 className="h5 letra-contenido titulo-icono" id={`${id}-titulo`}>
            <i className="bi bi-megaphone-fill" aria-hidden="true" />
            Nadie va a {destinoInicial} todavía
          </h2>
        </>
      ) : (
        <h2 className="h5 letra-contenido" id={`${id}-titulo`}>
          Solicitar un viaje
        </h2>
      )}
      <p className="texto-secundario">
        Dinos desde dónde sales, a dónde vas y cuánto puedes pagar. Los conductores verán tu
        solicitud en «Buscar».
      </p>

      <form onSubmit={manejarEnvio} noValidate>
        <div className="mb-2">
          <BarrioDropdown
            id={`${id}-origen`}
            label="Desde"
            value={origen}
            onChange={cambiarOrigen}
            opcionesBase={barriosRutaCotidiana}
            opcionesAdicionales={LUGARES_ADICIONALES}
            textoSeleccion="Seleccionar barrio de origen"
          />
          <p className="texto-secundario small mt-1 mb-0" role="status">
            {MENSAJE_UBICACION[estadoUbicacion]}
            {estadoUbicacion === "manual" && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-1 align-baseline"
                onClick={reintentarUbicacion}
              >
                Usar mi ubicación
              </button>
            )}
          </p>
        </div>

        <div className="mb-3">
          <BarrioDropdown
            id={`${id}-destino`}
            label="Hacia"
            value={destino}
            onChange={cambiarDestino}
            opcionesBase={barriosRutaCotidiana}
            opcionesAdicionales={LUGARES_ADICIONALES}
            textoSeleccion="Seleccionar barrio de destino"
          />
        </div>

        <div className="mb-3">
          <label className="form-label letra-contenido" htmlFor={`${id}-precio`}>
            Precio que propones (COP)
          </label>
          <input
            id={`${id}-precio`}
            type="number"
            className="form-control"
            inputMode="numeric"
            min="1"
            step="100"
            value={precio}
            onChange={(evento) => setPrecio(evento.target.value)}
            required
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-7">
            <label className="form-label letra-contenido" htmlFor={`${id}-fecha`}>
              Fecha
            </label>
            <input
              id={`${id}-fecha`}
              type="date"
              className="form-control"
              min={minimoFecha}
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
              required
            />
          </div>
          <div className="col-5">
            <label className="form-label letra-contenido" htmlFor={`${id}-hora`}>
              Hora
            </label>
            <input
              id={`${id}-hora`}
              type="time"
              className="form-control"
              value={hora}
              onChange={(evento) => setHora(evento.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex flex-wrap align-items-center gap-2">
          <button type="submit" className="btn-reservar" disabled={enviando}>
            {enviando ? "Enviando..." : "Solicitar viaje"}
          </button>
          {onCerrar && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={onCerrar}
              disabled={enviando}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
