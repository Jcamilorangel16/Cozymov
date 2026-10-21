// Muestra el resumen del viaje que quedó publicado y esperando pasajeros.

/**
 * Presenta los detalles de un viaje publicado y sus acciones disponibles.
 * @param {object} props Viaje y controladores de edición o nueva publicación.
 * @returns Resumen visual del viaje activo.
 */
export default function EsperandoPasajeros({
  viaje,
  onEditarViaje,
  onPublicarOtro,
}) {
  return (
    <section className="card color-card mx-auto w-100" style={{ maxWidth: 680 }}>
      <div className="card-body p-4 p-md-5">
        <div className="d-flex align-items-center gap-3 mb-4">
          <span className="fs-2" aria-hidden="true">🚗</span>
          <div>
            <h3 className="h4 letra-contenido mb-1">Viaje publicado</h3>
            <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
              Esperando pasajeros
            </span>
          </div>
        </div>

        <h4 className="h6 fw-bold texto-secundario mb-3">Puntos de recorrido</h4>
        <div className="d-flex align-items-stretch gap-3 mb-4">
          <div className="d-flex flex-column align-items-center" aria-hidden="true">
            <span className="text-success">●</span>
            <span className="border-start flex-grow-1 my-1" />
            <span className="text-danger">●</span>
          </div>
          <div className="d-flex flex-column justify-content-between gap-3">
            <div>
              <small className="d-block text-secondary">Origen</small>
              <strong className="letra-contenido">{viaje.origen}</strong>
            </div>
            <div>
              <small className="d-block text-secondary">Destino</small>
              <strong className="letra-contenido">{viaje.destino}</strong>
            </div>
          </div>
        </div>

        <div className="rounded-3 bg-light p-3 mb-4">
          <small className="d-block text-secondary">Punto específico de encuentro</small>
          <strong className="letra-contenido">{viaje.puntoEncuentro}</strong>
        </div>

        <div className="rounded-3 bg-light p-3 mb-4">
          <small className="d-block text-secondary">Precio del pasaje</small>
          <strong className="fs-5 letra-contenido">
            {new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              maximumFractionDigits: 0,
            }).format(viaje.precioPasaje)}
          </strong>
        </div>

        <div className="rounded-3 bg-light p-3 mb-4">
          <small className="d-block text-secondary">Fecha y hora de salida</small>
          <strong className="letra-contenido">
            {new Intl.DateTimeFormat("es-CO", {
              dateStyle: "long",
              timeZone: "UTC",
            }).format(new Date(`${viaje.fechaSalida}T12:00:00Z`))}
            {" · "}
            {viaje.horaSalida}
          </strong>
        </div>

        <div className="rounded-3 bg-light p-3 mb-4">
          <small className="d-block text-secondary">Cupos disponibles</small>
          <strong className="fs-5 letra-contenido">
            {viaje.cuposDisponibles} {viaje.cuposDisponibles === 1 ? "pasajero" : "pasajeros"}
          </strong>
        </div>

        {viaje.informacionAdicional && (
          <div className="rounded-3 bg-light p-3 mb-4">
            <small className="d-block text-secondary">Información adicional</small>
            <p className="mb-0 text-break">{viaje.informacionAdicional}</p>
          </div>
        )}

        <p className="texto-secundario mb-4" role="status">
          Tu viaje queda en estado de espera mientras los pasajeros revisan el recorrido.
        </p>
        <div className="d-flex flex-wrap justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={onEditarViaje}
          >
            Editar viaje
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={onPublicarOtro}
          >
            Publicar otro viaje
          </button>
        </div>
      </div>
    </section>
  );
}
