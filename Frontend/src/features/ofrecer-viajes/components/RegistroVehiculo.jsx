import "./RegistroVehiculo.css";
import RutaCotidianaSelect from "./RutaCotidianaSelect";

export default function RegistroVehiculo({ vehiculo, error, onFieldChange, onSubmit }) {
  return (
    <div className="vista registro-vehiculo">
      <form className="registro-vehiculo__card" onSubmit={onSubmit}>
        <div className="registro-vehiculo__heading">
          <span className="registro-vehiculo__icon" aria-hidden="true">🚘</span>
          <div>
            <h3 className="registro-vehiculo__title">Registra tu vehículo</h3>
            <p className="registro-vehiculo__description">
              Completa los datos para empezar a ofrecer viajes.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="tipo-vehiculo">Tipo de vehículo</label>
          <select
            className="form-select"
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
          <label className="form-label" htmlFor="foto-vehiculo">Foto del vehículo</label>
          <input
            className="form-control"
            id="foto-vehiculo"
            type="file"
            accept="image/*"
          />
          <small className="registro-vehiculo__hint">
            La foto todavía no se guarda; esta opción es solo para seleccionar el archivo.
          </small>
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="ruta-cotidiana">Ruta cotidiana</label>
          <RutaCotidianaSelect
            id="ruta-cotidiana"
            value={vehiculo.rutaCotidiana}
            onChange={(valor) => onFieldChange("rutaCotidiana", valor)}
          />
          <small className="registro-vehiculo__hint">
            Selecciona el barrio o sector de origen de tu ruta cotidiana hacia la Universidad Popular Del Cesar.
          </small>
        </div>

        <button type="submit" className="btn registro-vehiculo__submit">
          Guardar vehículo
        </button>
      </form>
    </div>
  );
}
