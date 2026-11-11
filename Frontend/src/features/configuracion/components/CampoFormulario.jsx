// Campo de formulario con etiqueta y mensaje de error reutilizable.

/**
 * @param {{id: string, label: string, error?: string, as?: string}} props
 * @returns Campo con etiqueta, control y error.
 */
export default function CampoFormulario({
  id,
  label,
  error,
  as: Control = "input",
  ...resto
}) {
  return (
    <div className="config-campo">
      <label htmlFor={id} className="config-label">
        {label}
      </label>
      <Control
        id={id}
        name={id}
        className={"form-control" + (error ? " is-invalid" : "")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...resto}
      />
      {error && 
        <small id={`${id}-error`} className="config-error" role="alert">
          {error}
        </small>}
    </div>
  );
}