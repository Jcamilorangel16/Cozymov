import "./RegistroVehiculo.css";

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

        {vehiculo.tipo === "moto" && (
          <div className="registro-vehiculo__field">
            <label className="form-label" htmlFor="modalidad-moto">Modalidad</label>
            <select
              className="form-select"
              id="modalidad-moto"
              required
              value={vehiculo.modalidad}
              onChange={(evento) => onFieldChange("modalidad", evento.target.value)}
            >
              <option value="" disabled>Selecciona una modalidad</option>
              <option value="automatica">Automática</option>
              <option value="mecanica">Mecánica</option>
            </select>
          </div>
        )}

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
          <input
            className="form-control"
            id="ruta-cotidiana"
            type="text"
            placeholder="Ej. Barrio La Floresta → Centro"
            required
            value={vehiculo.rutaCotidiana}
            onChange={(evento) => onFieldChange("rutaCotidiana", evento.target.value)}
          />
          <small className="registro-vehiculo__hint">
            Indica el barrio o sector de origen y el destino que recorres habitualmente.
          </small>
        </div>

        <button type="submit" className="btn registro-vehiculo__submit">
          Guardar vehículo
        </button>
      </form>
    </div>
  );
}
