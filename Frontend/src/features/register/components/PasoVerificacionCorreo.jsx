"use client";

export default function PasoVerificacionCorreo({
  correo,
  codigo,
  setCodigo,
  enviandoCodigo,
  verificandoCodigo,
  error,
  mensaje,
  onVerificar,
  onReenviar,
  onAtras,
}) {
  const ocupado = enviandoCodigo || verificandoCodigo;

  function manejarTecla(evento) {
    if (evento.key === "Enter" && codigo.length === 6 && !ocupado) {
      evento.preventDefault();
      onVerificar();
    }
  }

  return (
    <section className="paso-correo" aria-labelledby="titulo-verificacion">
      <div className="icono-correo" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <rect x="5" y="10" width="38" height="28" rx="5" />
          <path d="m7 14 17 13 17-13" />
        </svg>
      </div>
      <h1 id="titulo-verificacion" className="h2 text-center mb-2">
        Revisa tu correo
      </h1>
      <p className="text-center text-muted mb-1">
        Enviamos un código de verificación a:
      </p>
      <strong className="correo-destino">{correo}</strong>
      <p className="text-center text-muted mt-3 mb-4">
        {mensaje || "Ingresa el código de 6 dígitos para continuar."}
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
        pattern="[0-9]{6}"
        placeholder="000000"
        value={codigo}
        onChange={(evento) =>
          setCodigo(evento.target.value.replace(/\D/g, "").slice(0, 6))
        }
        onKeyDown={manejarTecla}
        disabled={ocupado}
      />

      {error ? (
        <div className="alert alert-danger py-2 mt-3 mb-0" role="alert">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-link reenviar-correo"
        onClick={onReenviar}
        disabled={ocupado}
      >
        {enviandoCodigo
          ? "Enviando código..."
          : "¿No te llegó? Revisa la carpeta de spam o envíalo de nuevo"}
      </button>

      <div className="d-flex gap-3 mt-4">
        <button
          type="button"
          className="btn btn-outline-secondary flex-fill"
          onClick={onAtras}
          disabled={ocupado}
        >
          Atrás
        </button>
        <button
          type="button"
          className="btn btn-primary flex-fill"
          onClick={onVerificar}
          disabled={ocupado || codigo.length !== 6}
        >
          {verificandoCodigo ? "Verificando..." : "Verificar y continuar"}
        </button>
      </div>
    </section>
  );
}
