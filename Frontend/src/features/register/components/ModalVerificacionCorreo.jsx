// Ventana emergente para ingresar el código enviado al correo institucional.
"use client";

/**
 * Muestra el formulario de 6 dígitos que confirma el correo del registro.
 * @param {object} props Estado y acciones de la verificación.
 * @returns Modal de confirmación o null cuando está cerrado.
 */
export default function ModalVerificacionCorreo({
  abierto,
  correo,
  codigo,
  setCodigo,
  enviandoCodigo,
  verificandoCodigo,
  errorVerificacion,
  mensajeVerificacion,
  segundosReenvio,
  onVerificar,
  onReenviar,
  onCerrar,
}) {
  if (!abierto) return null;

  const ocupado = enviandoCodigo || verificandoCodigo;

  /**
   * Envía el código al presionar Enter dentro del campo.
   * @param {React.KeyboardEvent<HTMLInputElement>} evento Evento de teclado.
   * @returns {void}
   */
  function manejarTecla(evento) {
    if (evento.key === "Escape" && !ocupado) {
      onCerrar();
      return;
    }
    if (evento.key === "Enter") {
      evento.preventDefault();
      if (!ocupado && codigo.length === 6) onVerificar();
    }
  }

  return (
    <div
      className="verificacion-overlay"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget && !ocupado) onCerrar();
      }}
    >
      <div
        className="verificacion-modal card shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-verificacion"
        onKeyDown={manejarTecla}
      >
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <h2 id="titulo-verificacion" className="h4 mb-0">
              Confirma tu correo
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Cerrar"
              onClick={onCerrar}
              disabled={ocupado}
            />
          </div>

          <p className="text-muted mb-3">
            {mensajeVerificacion ||
              `Enviamos un código de 6 dígitos a ${correo || "tu correo institucional"}.`}
          </p>

          <label htmlFor="codigo-verificacion" className="form-label">
            Código de verificación
          </label>
          <input
            id="codigo-verificacion"
            className="form-control form-control-lg text-center codigo-verificacion"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="000000"
            value={codigo}
            onChange={(evento) =>
              setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))
            }
            autoFocus
            disabled={verificandoCodigo}
          />

          {errorVerificacion ? (
            <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
              {errorVerificacion}
            </div>
          ) : null}

          <button
            type="button"
            className="btn btn-primary w-100 mt-3"
            onClick={onVerificar}
            disabled={ocupado || codigo.length !== 6}
          >
            {verificandoCodigo ? "Verificando..." : "Verificar código"}
          </button>

          <button
            type="button"
            className="btn btn-link w-100 mt-1"
            onClick={onReenviar}
            disabled={ocupado || segundosReenvio > 0}
          >
            {enviandoCodigo
              ? "Enviando código..."
              : segundosReenvio > 0
                ? `Reenviar código en ${segundosReenvio} s`
                : "Reenviar código"}
          </button>

          <p className="text-muted small text-center mb-0">
            Revisa también la carpeta de spam. El código vence en 10 minutos.
          </p>
        </div>
      </div>
    </div>
  );
}
