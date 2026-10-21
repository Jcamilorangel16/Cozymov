// Presenta el formulario de registro de un vehículo del conductor.
import "../styles/RegistroVehiculo.css";
import RutaCotidianaSelect from "./RutaCotidianaSelect";

/**
 * Renderiza los datos requeridos para guardar el vehículo.
 * @param {object} props Estado del vehículo, errores y acciones del formulario.
 * @returns Formulario de registro de vehículo.
 */
export default function RegistroVehiculo({
  vehiculo,
  error,
  guardando,
  onFieldChange,
  onSubmit,
}) {
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
            <option value="Bicicleta electrica">Bicicleta eléctrica</option>
            <option value="Moto">Moto</option>
            <option value="Automovil">Automóvil</option>
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

        {vehiculo.tipo === "Automovil" && (
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

        {vehiculo.tipo === "Moto" && (
          <div className="registro-vehiculo__field">
            <label className="form-label" htmlFor="modalidad-moto">Modalidad de la moto</label>
            <input
              className="form-control"
              id="modalidad-moto"
              type="text"
              maxLength={20}
              required
              value={vehiculo.modalidad}
              onChange={(evento) => onFieldChange("modalidad", evento.target.value)}
            />
          </div>
        )}

        <p className="small text-secondary">
          La carga de fotos del vehículo todavía no está disponible.
        </p>

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

        <button
          type="submit"
          className="btn btn-primary w-100 fw-bold py-2"
          disabled={guardando}
        >
          {guardando ? "Guardando vehículo..." : "Guardar vehículo"}
        </button>
      </form>
    </div>
  );
}
