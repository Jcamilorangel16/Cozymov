// Muestra el panel inicial con viajes destacados y actividad reciente.
import {
  feedNotificaciones,
  proximosViajes,
  viajesDestacados,
} from "../constants/menuPrincipal";

/**
 * Renderiza el resumen inicial del menú principal.
 * @param {{onNavigate: (id: string) => void}} props Acción para abrir otra sección.
 * @returns Panel de inicio.
 */
export default function PanelInicio({ onNavigate }) {
  return (
    <div className="vista">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h3 className="mb-0 letra-contenido">Tu Panel de Control</h3>

        <div className="d-flex flex-wrap gap-2">
          <div className="input-group" style={{ width: 200 }}>
            <span className="input-group-text" aria-hidden="true">🔍</span>
            <input type="text" className="form-control" placeholder="Origen..." />
          </div>

          <div className="input-group" style={{ width: 170 }}>
            <span className="input-group-text" aria-hidden="true">📅</span>
            <input type="date" className="form-control" aria-label="Fecha del viaje" />
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate("ofrecer")}
          >
            + Ofrecer viaje
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <h5 className="mb-3 letra-contenido fw-bold">Viajes para ti</h5>
          <div className="d-flex flex-column gap-3">
            {viajesDestacados.map((viaje) => (
              <article className="viaje-item" key={viaje.ruta}>
                <div className="viaje-hora">
                  <span className="viaje-hora-valor">{viaje.hora}</span>
                  <small className="texto-secundario">{viaje.dia}</small>
                </div>

                <div className="viaje-info">
                  <div className="fw-semibold letra-contenido">{viaje.ruta}</div>
                  <span
                    className={`viaje-cupos${viaje.cupos === 1 ? " viaje-cupos-ultimo" : ""}`}
                  >
                    {viaje.cupos === 1
                      ? "Última plaza"
                      : `${viaje.cupos} plazas libres`}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-reservar"
                  onClick={() => onNavigate("buscar")}
                >
                  Buscar viaje
                </button>
              </article>
            ))}
          </div>
        </div>

        <div className="col-md-4">
          <section className="panel-lateral mb-4">
            <h5 className="letra-contenido fw-bold mb-3">Tu próximo viaje</h5>
            {proximosViajes[0] && (
              <div className="proximo-destacado">
                <small className="proximo-dia">{proximosViajes[0].horario}</small>
                <div className="fw-bold letra-contenido">
                  {proximosViajes[0].ruta}
                </div>
              </div>
            )}
            {proximosViajes[1] && (
              <div className="d-flex align-items-end gap-2 mt-3">
                <small className="texto-secundario">
                  Después: {proximosViajes[1].horario}
                  <br />
                  {proximosViajes[1].ruta}
                </small>
              </div>
            )}
          </section>

          <h5 className="mb-3 letra-contenido fw-bold">Actividad reciente</h5>
          <div className="d-flex flex-column gap-2">
            {feedNotificaciones.map((item, indice) => (
              <div className="actividad-item" key={`${item.texto}-${indice}`}>
                <span className="actividad-icono" aria-hidden="true">
                  {item.icono}
                </span>
                <div>
                  <div className="fw-semibold letra-contenido small">
                    {item.texto}
                  </div>
                  <small className="texto-secundario">{item.detalle}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
