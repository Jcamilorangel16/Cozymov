// Renderiza precio, cupos, punto de encuentro e información complementaria.

import PuntoEncuentroDropdown from "./PuntoEncuentroDropdown";
import { PRECIOS_SUGERIDOS } from "../constants/ofrecerViajes";
import { formatearPrecio } from "../utils/fechaHora";

/**
 * Presenta y actualiza los detalles adicionales de un viaje.
 * @param {object} props Valores y controladores de los detalles.
 * @returns Campos visuales de precio y capacidad del viaje.
 */
export default function DetallesViaje({
  precioPasaje,
  setPrecioPasaje,
  cuposDisponibles,
  setCuposDisponibles,
  puntoEncuentro,
  setPuntoEncuentro,
  informacionAdicional,
  setInformacionAdicional,
  setErrorPublicacion,
}) {
  // Un campo vacío no es «0»: solo cuenta como colaboración si el valor es "0".
  const modoColaboracion = String(precioPasaje).trim() !== "" && Number(precioPasaje) === 0;

  return (
    <>
      <div className="rounded-3 bg-light p-3 mb-4">
        <label className="form-label fw-semibold" htmlFor="precio-pasaje">
          Precio del pasaje
        </label>
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="modo-colaboracion"
            checked={modoColaboracion}
            onChange={(evento) => {
              setPrecioPasaje(evento.target.checked ? "0" : "");
              setErrorPublicacion("");
            }}
            aria-describedby="modo-colaboracion-ayuda"
          />
          <label className="form-check-label fw-semibold" htmlFor="modo-colaboracion">
            Modo colaboración (pasaje de $0)
          </label>
          <small className="d-block text-secondary" id="modo-colaboracion-ayuda">
            Llevas a tus pasajeros sin cobrarles. En la búsqueda aparecerá como «Modo
            colaboración».
          </small>
        </div>
        <div className="input-group mb-3">
          <span className="input-group-text">$</span>
          <input
            className="form-control"
            id="precio-pasaje"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="Escribe el precio que quieras"
            value={precioPasaje}
            onChange={(evento) => {
              setPrecioPasaje(evento.target.value);
              setErrorPublicacion("");
            }}
            aria-describedby="precio-pasaje-ayuda"
            disabled={modoColaboracion}
            required
          />
          <span className="input-group-text">COP</span>
        </div>
        <small className="d-block text-secondary mb-2" id="precio-pasaje-ayuda">
          {modoColaboracion
            ? "Modo colaboración activo: el pasaje no tendrá costo."
            : "Escribe el precio que cobrarás o selecciona una sugerencia:"}
        </small>
        <div className="d-flex flex-wrap gap-2" aria-label="Precios sugeridos">
          {PRECIOS_SUGERIDOS.map((precio) => (
            <button
              key={precio}
              type="button"
              disabled={modoColaboracion}
              className={`btn btn-sm ${Number(precioPasaje) === precio ? "btn-primary" : "btn-outline-primary"}`}
              aria-pressed={Number(precioPasaje) === precio}
              onClick={() => {
                setPrecioPasaje(String(precio));
                setErrorPublicacion("");
              }}
            >
              {formatearPrecio(precio)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold" htmlFor="cupos-disponibles">
          Cupos disponibles
        </label>
        <input
          className="form-control"
          id="cupos-disponibles"
          type="number"
          min="1"
          max="7"
          step="1"
          inputMode="numeric"
          value={cuposDisponibles}
          onChange={(evento) => {
            setCuposDisponibles(evento.target.value);
            setErrorPublicacion("");
          }}
          aria-describedby="cupos-disponibles-ayuda"
          required
        />
        <small className="d-block text-secondary mt-1" id="cupos-disponibles-ayuda">
          Indica cuántos pasajeros puedes llevar (máximo 7).
        </small>
      </div>

      <div className="mb-4">
        <PuntoEncuentroDropdown
          value={puntoEncuentro}
          onChange={(punto) => {
            setPuntoEncuentro(punto);
            setErrorPublicacion("");
          }}
        />
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold" htmlFor="informacion-adicional">
          Información adicional <span className="text-secondary fw-normal">(opcional)</span>
        </label>
        <textarea
          className="form-control"
          id="informacion-adicional"
          rows="3"
          maxLength="500"
          placeholder="Agrega indicaciones u otros detalles para tus pasajeros..."
          value={informacionAdicional}
          onChange={(evento) => setInformacionAdicional(evento.target.value)}
          aria-describedby="informacion-adicional-ayuda"
        />
        <small className="d-block text-secondary mt-1" id="informacion-adicional-ayuda">
          Máximo 500 caracteres.
        </small>
      </div>
    </>
  );
}
