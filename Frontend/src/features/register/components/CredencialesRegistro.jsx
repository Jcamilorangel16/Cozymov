// Renderiza las credenciales y los controles de envío del registro.

/**
 * Muestra correo, contraseñas y acciones de registro.
 * @param {object} props Datos y acciones de acceso del formulario.
 * @returns Campos de credenciales y botones de formulario.
 */
export default function CredencialesRegistro({
  asignarRef,
  datosUsuario,
  confirmarContrasena,
  setConfirmarContrasena,
  guardando,
  manejarCambio,
  manejarTeclado,
  manejarSiguiente,
}) {
  return (
    <>
      <div className="col-md-6">
        <label htmlFor="correo" className="form-label">Correo Institucional</label>
        <input
          id="correo"
          name="correo"
          type="email"
          className="form-control"
          placeholder="✉ Sergio.Gomez@universidad.edu.co"
          pattern="[^\s@]+@[^\s@]+\.edu\.co"
          title="Usa un correo institucional que termine en .edu.co"
          maxLength={150}
          value={datosUsuario.correo}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "correo")}
          ref={asignarRef("correo")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="contrasena" className="form-label">Contraseña</label>
        <input
          id="contrasena"
          name="contrasena"
          type="password"
          className="form-control"
          placeholder=" 🔒 Ingrese su contraseña"
          value={datosUsuario.contrasena}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "contrasena")}
          ref={asignarRef("contrasena")}
        />

        <label htmlFor="confirmar-contrasena" className="form-label mt-3">Confirmar Contraseña</label>
        <input
          id="confirmar-contrasena"
          name="confirmar-contrasena"
          type="password"
          className="form-control"
          placeholder=" 🔒 Confirme su contraseña"
          value={confirmarContrasena}
          onChange={(e) => setConfirmarContrasena(e.target.value)}
          onKeyDown={(e) => manejarTeclado(e, "confirmar-contrasena")}
          ref={asignarRef("confirmar-contrasena")}
        />

        <button
          id="siguiente"
          type="button"
          className="btn btn-primary w-100 mt-5"
          onClick={manejarSiguiente}
          disabled={guardando}
        >
          {guardando ? "Creando cuenta..." : "Siguiente"}
        </button>
        <button
          id="volver"
          type="button"
          className="btn btn-light position-fixed top-0 start-0 m-5 shadow-sm"
          onClick={() => window.history.back()}
          aria-label="Volver a la página anterior"
        >
          &larr; Atrás
        </button>
      </div>
    </>
  );
}
