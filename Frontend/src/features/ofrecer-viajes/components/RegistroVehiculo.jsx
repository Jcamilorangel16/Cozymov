import "../CSS/RegistroVehiculo.css";
import RutaCotidianaSelect from "./RutaCotidianaSelect";

export default function RegistroVehiculo({ vehiculo, error, onFieldChange, onSubmit }) {
  return (
    <div className="vista d-flex justify-content-center py-4">
      <form className="registro-vehiculo__card w-100 p-4 p-md-5 border rounded-4 shadow" onSubmit={onSubmit}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <span className="registro-vehiculo__icon d-flex align-items-center justify-content-center flex-shrink-0 rounded-4" aria-hidden="true">🚘</span>
          <div>
            <h3 className="h4 fw-bold mb-1">Registra tu vehículo</h3>
            <p className="text-secondary mb-0">
              Completa los datos para empezar a ofrecer viajes.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="tipo-vehiculo">Tipo de vehículo</label>
          <select
            className="form-select rounded-3"
            id="tipo-vehiculo"
            required
            value={vehiculo.tipo}
            onChange={(evento) => onFieldChange("tipo", evento.target.value)}
          >
            <option value="" disabled>Selecciona un tipo</option>
            <option value="bicicleta-electrica">Bicicleta eléctrica</option>
            <option value="moto">Moto</option>
            <option value="automovil">Automóvil</option>
          </select>
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="modelo-vehiculo">Modelo</label>
          <input
            className="form-control"
            id="modelo-vehiculo"
            type="text"
            required
            value={vehiculo.modelo}
            onChange={(evento) => onFieldChange("modelo", evento.target.value)}
          />
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="capacidad-vehiculo">Capacidad de pasajeros</label>
          <input
            className="form-control"
            id="capacidad-vehiculo"
            type="number"
            min="1"
            max="32767"
            step="1"
            required
            value={vehiculo.capacidad}
            onChange={(evento) => onFieldChange("capacidad", evento.target.value)}
          />
        </div>

        {vehiculo.tipo === "automovil" && (
          <div className="registro-vehiculo__field">
            <label className="form-label" htmlFor="numero-puertas">Número de puertas</label>
            <input
              className="form-control"
              id="numero-puertas"
              type="number"
              min="2"
              max="5"
              step="1"
              required
              value={vehiculo.numeroPuertas}
              onChange={(evento) => onFieldChange("numeroPuertas", evento.target.value)}
            />
          </div>
        )}

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="foto-vehiculo">Foto del vehículo</label>
          <input
            className="form-control rounded-3"
            id="foto-vehiculo"
            type="file"
            accept="image/*"
            required
          />
          <small className="d-block mt-1 text-secondary">
            Debes subir una foto de tu vehículo (máximo 2 MB). Tómala sin que se vea la matrícula.
          </small>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="ruta-cotidiana">Ruta cotidiana</label>
          <RutaCotidianaSelect
            id="ruta-cotidiana"
            value={vehiculo.rutaCotidiana}
            onChange={(valor) => onFieldChange("rutaCotidiana", valor)}
          />
          <small className="d-block mt-1 text-secondary">
            Selecciona el barrio o sector de origen de tu ruta cotidiana hacia la Universidad Popular Del Cesar.
          </small>
        </div>

        <button type="submit" className="btn btn-primary w-100 fw-bold py-2">
          Guardar vehículo
        </button>
      </form>
    </div>
  );
}
