// Muestra el panel inicial con viajes destacados y actividad de ejemplo.

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
            <span className="input-group-text">🔍</span>
            <input type="text" className="form-control" placeholder="Origen..." />
          </div>

          <div className="input-group" style={{ width: 170 }}>
            <span className="input-group-text">📅</span>
            <input type="date" className="form-control" />
          </div>

          <button type="button" className="btn btn-primary" onClick={() => onNavigate("ofrecer")}>
            + Ofrecer viaje
          </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <h5 className="mb-3 letra-contenido">Viajes destacados para ti</h5>
          <div className="row g-3">
            {viajesDestacados.map((viaje, indice) => (
              <div className="col-md-6" key={indice}>
                <div className="card p-2 color-card">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fs-4">🚗</span>
                    <div>
                      <div className="fw-semibold">{viaje.ruta}</div>
                      <small className="text-muted">{viaje.horario}</small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-md-4">
          <h5 className="mb-3 letra-contenido">Próximos viajes</h5>
          <div className="d-flex flex-column gap-2 mb-4">
            {proximosViajes.map((viaje, indice) => (
              <div className="card p-2 color-card" key={indice}>
                <div className="fw-semibold letra-contenido">{viaje.ruta}</div>
                <small className="texto-secundario">{viaje.horario}</small>
              </div>
            ))}
          </div>

          <h5 className="mb-3 letra-contenido">Feed de notificaciones y actividad</h5>
          <div className="d-flex flex-column gap-2">
            {feedNotificaciones.map((item, indice) => (
              <div className="d-flex align-items-center gap-2" key={indice}>
                <span className="fs-5">{item.icono}</span>
                <div>
                  <span className="fw-semibold letra-contenido">{item.texto}</span>
                  <span className="texto-secundario"> · {item.detalle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
