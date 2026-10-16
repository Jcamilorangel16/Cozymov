const viajesDestacados = [
  { ruta: "Campus Sur → Centro", horario: "Hoy 7:00 AM · 3 plazas" },
  { ruta: "Norte → Campus Sur", horario: "Mañana 6:45 AM · 1 lugar" },
  { ruta: "Campus Norte → Centro", horario: "Hoy 8:15 AM · 2 plazas" },
  { ruta: "Campus Sur → Este", horario: "Hoy 9:00 AM · 4 lugares" },
];

const proximosViajes = [
  { ruta: "Campus Norte → Centro", horario: "Mañana 8:00 AM" },
  { ruta: "Campus Norte → Centro", horario: "Mañana 9:00 AM" },
];

const feedNotificaciones = [
  { icono: "📅", texto: "Cita agendada", detalle: "Camila Angel" },
  { icono: "✉️", texto: "Mensaje recibido", detalle: "Yefersonpazo" },
  { icono: "🔔", texto: "Nuevo viaje publicado", detalle: "system" },
];

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
            {viajesDestacados.map((viaje) => (
              <div className="col-md-6" key={viaje.ruta}>
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
          <h5 className="mb-3 letra-contenido">Mis Próximos Viajes</h5>
          <div className="d-flex flex-column gap-2">
            {proximosViajes.map((viaje) => (
              <div
                className="card p-3 d-flex flex-row justify-content-between align-items-center color-card"
                key={viaje.horario}
              >
                <div>
                  <div className="fw-semibold">{viaje.ruta}</div>
                  <small className="text-muted">{viaje.horario}</small>
                </div>
                <span className="badge bg-success">Agendado</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h5 className="mt-4 mb-3 letra-contenido">Feed de notificaciones y actividad</h5>
          <div className="d-flex flex-column gap-2">
            {feedNotificaciones.map((item) => (
              <div className="d-flex align-items-center gap-2" key={`${item.texto}-${item.detalle}`}>
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
