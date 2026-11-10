// Muestra rutas destacadas, actividad y accesos rápidos del panel inicial.
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
    <div className="vista dashboard-view">
      <section className="dashboard-heading">
        <div>
          <span className="dashboard-eyebrow">TU ESPACIO DE MOVILIDAD</span>
          <h1>¡Hola! ¿A dónde vamos hoy?</h1>
          <p>Encuentra un trayecto o comparte el tuyo con la comunidad.</p>
        </div>
        <button
          type="button"
          className="dashboard-primary-action"
          onClick={() => onNavigate("ofrecer")}
        >
          <span aria-hidden="true">+</span> Ofrecer viaje
        </button>
      </section>

      <section className="dashboard-welcome">
        <div>
          <span className="dashboard-welcome-label">MUÉVETE A TU MANERA</span>
          <h2>Un buen viaje empieza encontrando tu ruta.</h2>
          <p>
            Explora los viajes disponibles o publica uno para compartir gastos
            en el camino.
          </p>
          <div className="dashboard-welcome-actions">
            <button type="button" onClick={() => onNavigate("buscar")}>
              Buscar viajes <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              className="dashboard-secondary-action"
              onClick={() => onNavigate("ofrecer")}
            >
              Publicar un viaje
            </button>
          </div>
        </div>
        <div className="dashboard-welcome-art" aria-hidden="true">
          <span className="dashboard-route-line" />
          <span className="dashboard-route-point dashboard-route-point-start" />
          <span className="dashboard-route-point dashboard-route-point-end" />
          <span className="dashboard-route-car">↗</span>
        </div>
      </section>

      <div className="dashboard-content-grid">
        <section className="dashboard-routes">
          <div className="dashboard-section-heading">
            <div>
              <span className="dashboard-section-kicker">DESCUBRE OPCIONES</span>
              <h2>Rutas destacadas</h2>
            </div>
            <button type="button" onClick={() => onNavigate("buscar")}>
              Ver viajes <span aria-hidden="true">→</span>
            </button>
          </div>

          <div className="dashboard-route-list">
            {viajesDestacados.map((viaje) => (
              <article className="dashboard-route-card" key={`${viaje.hora}-${viaje.ruta}`}>
                <div className="dashboard-route-time">
                  <strong>{viaje.hora}</strong>
                  <span>{viaje.dia}</span>
                </div>
                <div className="dashboard-route-copy">
                  <h3>{viaje.ruta}</h3>
                  <span className="dashboard-seat-badge">
                    {viaje.cupos === 1
                      ? "Último cupo"
                      : `${viaje.cupos} cupos disponibles`}
                  </span>
                </div>
                <button
                  type="button"
                  className="dashboard-route-open"
                  aria-label={`Buscar viaje: ${viaje.ruta}`}
                  onClick={() => onNavigate("buscar")}
                >
                  →
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="dashboard-aside">
          <section className="dashboard-next-card">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-section-kicker">EN TU AGENDA</span>
                <h2>Próximo viaje</h2>
              </div>
              <span className="dashboard-calendar-icon" aria-hidden="true">◷</span>
            </div>
            {proximosViajes[0] && (
              <div className="dashboard-next-trip">
                <span>{proximosViajes[0].horario}</span>
                <strong>{proximosViajes[0].ruta}</strong>
              </div>
            )}
            {proximosViajes[1] && (
              <p className="dashboard-next-later">
                Después: {proximosViajes[1].horario} · {proximosViajes[1].ruta}
              </p>
            )}
            <button
              type="button"
              className="dashboard-text-action"
              onClick={() => onNavigate("en-curso")}
            >
              Ver mis viajes <span aria-hidden="true">→</span>
            </button>
          </section>

          <section className="dashboard-activity">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-section-kicker">AL DÍA</span>
                <h2>Actividad reciente</h2>
              </div>
            </div>
            <div className="dashboard-activity-list">
              {feedNotificaciones.map((item, indice) => (
                <div className="dashboard-activity-item" key={`${item.texto}-${indice}`}>
                  <span className="dashboard-activity-icon" aria-hidden="true">
                    {item.icono}
                  </span>
                  <div>
                    <strong>{item.texto}</strong>
                    <span>{item.detalle}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="dashboard-quick-actions" aria-label="Accesos rápidos">
        <button type="button" onClick={() => onNavigate("buscar")}>
          <span aria-hidden="true">⌕</span>
          <span><strong>Buscar un viaje</strong><small>Explora las rutas disponibles</small></span>
          <span className="dashboard-quick-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" onClick={() => onNavigate("ofrecer")}>
          <span aria-hidden="true">↗</span>
          <span><strong>Compartir mi ruta</strong><small>Publica un nuevo trayecto</small></span>
          <span className="dashboard-quick-arrow" aria-hidden="true">→</span>
        </button>
        <button type="button" onClick={() => onNavigate("mensajes")}>
          <span aria-hidden="true">✉</span>
          <span><strong>Ver mensajes</strong><small>Continúa tus conversaciones</small></span>
          <span className="dashboard-quick-arrow" aria-hidden="true">→</span>
        </button>
      </section>
    </div>
  );
}
