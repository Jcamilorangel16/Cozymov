// Campos adicionales requeridos para una bicicleta eléctrica.
import { useId } from "react";

const ELEMENTOS_SEGURIDAD = [
  ["capacidadVehicular", "Capacidad vehicular"],
  ["casco", "Casco"],
  ["chaleco", "Chaleco"],
  ["luces", "Luces"],
];

/**
 * Presenta los datos específicos de una bicicleta eléctrica.
 * @param {{vehiculo: object, onFieldChange: (campo: string, valor: string|boolean) => void}} props Datos del formulario.
 * @returns Campos de bicicleta eléctrica.
 */
export default function CamposBicicleta({ vehiculo, onFieldChange }) {
  const idBase = useId();

  return (
    <>
      <div className="registro-vehiculo__field">
        <label className="form-label" htmlFor={`${idBase}-serie`}>Número de serie</label>
        <input
          className="form-control"
          id={`${idBase}-serie`}
          type="text"
          required
          value={vehiculo.numeroSerie}
          onChange={(evento) => onFieldChange("numeroSerie", evento.target.value)}
        />
      </div>
      <div className="registro-vehiculo__field">
        <label className="form-label" htmlFor={`${idBase}-velocidad`}>Velocidad máxima</label>
        <input
          className="form-control"
          id={`${idBase}-velocidad`}
          type="number"
          min="0.01"
          step="any"
          required
          value={vehiculo.velocidadMaxima}
          onChange={(evento) => onFieldChange("velocidadMaxima", evento.target.value)}
        />
      </div>
      <div className="registro-vehiculo__field">
        <label className="form-label" htmlFor={`${idBase}-peso`}>Capacidad de peso</label>
        <input
          className="form-control"
          id={`${idBase}-peso`}
          type="number"
          min="0.01"
          step="any"
          required
          value={vehiculo.capacidadPeso}
          onChange={(evento) => onFieldChange("capacidadPeso", evento.target.value)}
        />
      </div>
      <fieldset className="registro-vehiculo__field">
        <legend className="form-label">Elementos y capacidad</legend>
        <div className="registro-vehiculo__checkboxes">
          {ELEMENTOS_SEGURIDAD.map(([campo, etiqueta]) => {
            const id = `${idBase}-${campo}`;
            return (
              <div className="form-check" key={campo}>
                <input
                  className="form-check-input"
                  id={id}
                  type="checkbox"
                  checked={Boolean(vehiculo[campo])}
                  onChange={(evento) => onFieldChange(campo, evento.target.checked)}
                />
                <label className="form-check-label" htmlFor={id}>{etiqueta}</label>
              </div>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
