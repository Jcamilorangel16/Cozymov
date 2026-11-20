// Renderiza los datos personales, la ocupación y el celular del formulario de registro.

/**
 * Muestra los campos personales del nuevo usuario.
 * @param {object} props Valores y controladores de los campos personales.
 * @returns Campos personales del formulario.
 */
export default function DatosPersonalesRegistro({
  asignarRef,
  enfocarCampo,
  datosUsuario,
  tipoOcupacion,
  setTipoOcupacion,
  ocupacionOtro,
  setOcupacionOtro,
  manejarCambio,
  manejarTeclado,
}) {
  return (
    <>
      <div className="col-md-6">
        <label htmlFor="primerNombre" className="form-label">Primer nombre</label>
        <input
          id="primerNombre"
          name="primerNombre"
          type="text"
          className="form-control"
          maxLength={50}
          placeholder="Primer nombre"
          value={datosUsuario.primerNombre}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "primerNombre")}
          ref={asignarRef("primerNombre")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="segundoNombre" className="form-label">Segundo nombre (opcional)</label>
        <input
          id="segundoNombre"
          name="segundoNombre"
          type="text"
          className="form-control"
          maxLength={50}
          value={datosUsuario.segundoNombre}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "segundoNombre")}
          ref={asignarRef("segundoNombre")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="primerApellido" className="form-label">Primer apellido</label>
        <input
          id="primerApellido"
          name="primerApellido"
          type="text"
          className="form-control"
          maxLength={50}
          placeholder="Primer apellido"
          value={datosUsuario.primerApellido}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "primerApellido")}
          ref={asignarRef("primerApellido")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="segundoApellido" className="form-label">Segundo apellido (opcional)</label>
        <input
          id="segundoApellido"
          name="segundoApellido"
          type="text"
          className="form-control"
          maxLength={50}
          value={datosUsuario.segundoApellido}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "segundoApellido")}
          ref={asignarRef("segundoApellido")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="idUsuario" className="form-label">Cédula</label>
        <input
          id="idUsuario"
          name="idUsuario"
          type="text"
          inputMode="numeric"
          className="form-control"
          maxLength={11}
          pattern="[0-9]{1,10}"
          title="La cédula debe contener solo números y máximo 10 dígitos."
          placeholder="Número de cédula"
          value={datosUsuario.idUsuario}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "idUsuario")}
          ref={asignarRef("idUsuario")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="edad" className="form-label">Edad</label>
        <input
          id="edad"
          name="edad"
          type="number"
          className="form-control"
          min="16"
          max="32767"
          step="1"
          value={datosUsuario.edad}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "edad")}
          ref={asignarRef("edad")}
        />
      </div>
      <div className="col-md-6">
        <label htmlFor="tipoOcupacion" className="form-label">Ocupación</label>
        <select
          id="tipoOcupacion"
          className="form-select"
          required
          value={tipoOcupacion}
          onChange={(evento) => setTipoOcupacion(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              evento.preventDefault();
              enfocarCampo(tipoOcupacion === "otro" ? "ocupacionOtro" : "telefono");
            }
          }}
          ref={asignarRef("tipoOcupacion")}
        >
          <option value="" disabled>Selecciona una ocupación</option>
          <option value="estudiante">Estudiante</option>
          <option value="profesor">Profesor</option>
          <option value="otro">Otro</option>
        </select>
        {tipoOcupacion === "otro" && (
          <input
            id="ocupacionOtro"
            name="ocupacionOtro"
            type="text"
            className="form-control mt-2"
            maxLength={50}
            placeholder="Escribe tu ocupación"
            value={ocupacionOtro}
            onChange={(evento) => setOcupacionOtro(evento.target.value)}
            onKeyDown={(evento) => manejarTeclado(evento, "ocupacionOtro")}
            ref={asignarRef("ocupacionOtro")}
            required
            aria-label="Especifica tu ocupación"
          />
        )}
      </div>
      <div className="col-md-6">
        <label htmlFor="telefono" className="form-label">Celular</label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="form-control"
          maxLength={20}
          placeholder="300 123 4567"
          required
          aria-describedby="telefono-ayuda"
          value={datosUsuario.telefono}
          onChange={manejarCambio}
          onKeyDown={(e) => manejarTeclado(e, "telefono")}
          ref={asignarRef("telefono")}
        />
        <div id="telefono-ayuda" className="form-text">
          Obligatorio. Lo usaremos para recuperar tu contraseña.
        </div>
      </div>
    </>
  );
}
