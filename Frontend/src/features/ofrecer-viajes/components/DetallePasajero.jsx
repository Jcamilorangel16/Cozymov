// Presenta la información del pasajero seleccionado para el conductor.

/**
 * Muestra el resumen del pasajero y permite confirmar su aceptación.
 * @param {object} props Datos del pasajero, acción de aceptar y estado de retorno.
 * @returns Panel visual con los datos y acción del pasajero.
 */
export default function DetallePasajero({
  pasajero,
  mensajeAccion,
  onAceptar,
  onVolver,
}) {
  return (
    <div>
      <button
        type="button"
        className="btn btn-link texto-secundario ps-0 mb-3"
        onClick={onVolver}
      >
        ‹ Volver a pasajeros
      </button>

      <div className="row g-3">
        <div className="col-lg-5">
          <div className="card p-3 color-card">
            <h5 className="letra-contenido mb-0">{pasajero.ruta}</h5>
            <small className="texto-secundario d-block mb-3">{pasajero.horario}</small>

            <div className="d-flex align-items-center gap-2 mb-3">
              <div
                className={"user-avatar " + pasajero.avatarColor}
                style={{ width: 42, height: 42 }}
              >
                {pasajero.iniciales}
              </div>
              <div>
                <div className="fw-semibold letra-contenido">{pasajero.nombre}</div>
                <small className="texto-secundario">★ {pasajero.rating} · {pasajero.viajes} viajes</small>
              </div>
            </div>

            <small className="texto-secundario d-block">Punto de encuentro</small>
            <p className="fw-semibold mb-2" style={{ color: "#a03c3c" }}>{pasajero.punto}</p>

            <small className="texto-secundario d-block">Personas que viajan</small>
            <p className="fw-semibold mb-3" style={{ color: "#1457e7" }}>{pasajero.personas} persona(s)</p>

            <button type="button" className="btn btn-primary w-100" onClick={onAceptar}>
              Aceptar Pasajero
            </button>
            {mensajeAccion && <p className="alert alert-success mt-3 mb-0">{mensajeAccion}</p>}
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card color-card p-3 h-100 d-flex align-items-center justify-content-center text-center">
            <div style={{ fontSize: "3.5rem" }}>🗺️</div>
          </div>
        </div>
      </div>
    </div>
  );
}
