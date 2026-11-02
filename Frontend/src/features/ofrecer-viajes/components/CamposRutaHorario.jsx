// Renderiza los campos de origen, destino y horario de salida del viaje.

import BarrioDropdown from "./BarrioDropdown";
import { LUGARES_ADICIONALES } from "../constants/ofrecerViajes";
import { obtenerPartesFechaHora } from "../utils/fechaHora";

/**
 * Presenta y actualiza la ruta y el horario de salida.
 * @param {object} props Valores y controladores de los campos.
 * @returns Campos visuales de ruta y horario.
 */
export default function CamposRutaHorario({
  origen,
  setOrigen,
  destino,
  setDestino,
  fechaSalida,
  setFechaSalida,
  horaSalida,
  setHoraSalida,
  atajoSalida,
  setAtajoSalida,
  setErrorPublicacion,
}) {
  return (
    <>
      <div className="d-flex align-items-center gap-3 mb-4">
        <span className="fs-2" aria-hidden="true">🗺️</span>
        <div>
          <h3 className="h4 letra-contenido mb-1">Ruta y puntos de recorrido</h3>
          <p className="texto-secundario mb-0">Elige el barrio de origen y el de destino.</p>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <BarrioDropdown
            id="origen-viaje"
            label="Origen"
            value={origen}
            opcionesAdicionales={LUGARES_ADICIONALES}
            onChange={(barrio) => {
              setOrigen(barrio);
              setErrorPublicacion(
                barrio === destino
                  ? "El origen y el destino deben ser diferentes."
                  : "",
              );
            }}
          />
        </div>
        <div className="col-md-6">
          <BarrioDropdown
            id="destino-viaje"
            label="Destino"
            value={destino}
            opcionesAdicionales={LUGARES_ADICIONALES}
            onChange={(barrio) => {
              setDestino(barrio);
              setErrorPublicacion(
                barrio === origen
                  ? "El origen y el destino deben ser diferentes."
                  : "",
              );
            }}
          />
        </div>
      </div>

      <div className="rounded-3 bg-light p-3 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <h4 className="h6 fw-semibold mb-0">Fecha y hora de salida</h4>
          <label className="visually-hidden" htmlFor="atajo-salida">
            Seleccionar hora rápida de salida
          </label>
          <select
            className="form-select form-select-sm"
            id="atajo-salida"
            value={atajoSalida}
            onChange={(evento) => {
              const minutosAdelante = Number(evento.target.value);
              const salida = new Date();
              salida.setSeconds(0, 0);
              salida.setMinutes(salida.getMinutes() + minutosAdelante);
              const partes = obtenerPartesFechaHora(salida);
              setFechaSalida(partes.fecha);
              setHoraSalida(partes.hora);
              setAtajoSalida(evento.target.value);
              setErrorPublicacion("");
            }}
            style={{ maxWidth: 220 }}
          >
            <option value="">Hora rápida...</option>
            <option value="0">Ahora</option>
            <option value="5">En 5 minutos</option>
            <option value="15">En 15 minutos</option>
            <option value="30">En 30 minutos</option>
            <option value="60">En 1 hora</option>
            <option value="120">En 2 horas</option>
          </select>
        </div>
        <div className="row g-3">
          <div className="col-sm-6">
            <label className="form-label" htmlFor="fecha-salida">Fecha</label>
            <input
              className="form-control"
              id="fecha-salida"
              type="date"
              min={fechaSalida || undefined}
              value={fechaSalida}
              onChange={(evento) => {
                setFechaSalida(evento.target.value);
                setAtajoSalida("");
                setErrorPublicacion("");
              }}
              required
            />
          </div>
          <div className="col-sm-6">
            <label className="form-label" htmlFor="hora-salida">Hora</label>
            <input
              className="form-control"
              id="hora-salida"
              type="time"
              value={horaSalida}
              onChange={(evento) => {
                setHoraSalida(evento.target.value);
                setAtajoSalida("");
                setErrorPublicacion("");
              }}
              required
            />
          </div>
        </div>
      </div>
    </>
  );
}
