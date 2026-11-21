// Renderiza las credenciales y los controles de envío del registro.
import { useState } from "react";
import BotonVerContrasena from "../../../components/BotonVerContrasena";

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
  correoEstaVerificado,
  enviandoCodigo,
  confirmarCorreo,
  manejarCambio,
  manejarTeclado,
  manejarSiguiente,
}) {
  const ocupado = guardando || enviandoCodigo;
  const [verContrasena, setVerContrasena] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);

  return (
    <>
      <div className="col-md-6">
        <label htmlFor="correo" className="form-label">Correo Institucional</label>
        <input
          id="correo"
          name="correo"
          type="email"
          className={`form-control${correoEstaVerificado ? " is-valid" : ""}`}
          placeholder="✉ Sergio.Gomez@universidad.edu.co"
          pattern="[^\s@]+@[^\s@]+\.edu\.co"
          title="Usa un correo institucional que termine en .edu.co"
          maxLength={150}
          aria-describedby="correo-ayuda"
          value={datosUsuario.correo}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "correo")}
          ref={asignarRef("correo")}
          disabled={guardando}
        />
        {correoEstaVerificado ? (
          <div id="correo-ayuda" className="form-text text-success" role="status">
            <i className="bi bi-patch-check-fill" aria-hidden="true" /> Correo verificado.
          </div>
        ) : (
          <>
            <button
              id="confirmar-correo"
              type="button"
              className="btn btn-outline-primary w-100 mt-2"
              onClick={confirmarCorreo}
              ref={asignarRef("confirmar-correo")}
              disabled={ocupado}
              aria-busy={enviandoCodigo}
            >
              <i className="bi bi-envelope-check" aria-hidden="true" />{" "}
              {enviandoCodigo ? "Enviando código..." : "Confirmar correo"}
            </button>
            <div id="correo-ayuda" className="form-text">
              Obligatorio: te enviaremos un código de 6 dígitos a tu correo de Outlook para
              confirmar que es tuyo.
            </div>
          </>
        )}
      </div>
      <div className="col-md-6">
        <label htmlFor="contrasena" className="form-label">Contraseña</label>
        <div className="input-group">
          <input
            id="contrasena"
            name="contrasena"
            type={verContrasena ? "text" : "password"}
            className="form-control"
            placeholder=" 🔒 Ingrese su contraseña"
            value={datosUsuario.contrasena}
            onChange={manejarCambio}
            onKeyDown={(e) => manejarTeclado(e, "contrasena")}
            ref={asignarRef("contrasena")}
            disabled={guardando}
          />
          <BotonVerContrasena
            visible={verContrasena}
            onAlternar={() => setVerContrasena((v) => !v)}
            controla="contrasena"
            disabled={guardando}
          />
        </div>

        <label htmlFor="confirmar-contrasena" className="form-label mt-3">Confirmar Contraseña</label>
        <div className="input-group">
          <input
            id="confirmar-contrasena"
            name="confirmar-contrasena"
            type={verConfirmacion ? "text" : "password"}
            className="form-control"
            placeholder=" 🔒 Confirme su contraseña"
            value={confirmarContrasena}
            onChange={(e) => setConfirmarContrasena(e.target.value)}
            onKeyDown={(e) => manejarTeclado(e, "confirmar-contrasena")}
            ref={asignarRef("confirmar-contrasena")}
            disabled={guardando}
          />
          <BotonVerContrasena
            visible={verConfirmacion}
            onAlternar={() => setVerConfirmacion((v) => !v)}
            controla="confirmar-contrasena"
            disabled={guardando}
          />
        </div>

        <button
          id="siguiente"
          type="button"
          className="btn btn-primary w-100 mt-5"
          onClick={manejarSiguiente}
          disabled={guardando}
        >
          {guardando ? "Procesando..." : "Crear cuenta"}
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
