"use client";

// Formulario para cambiar la contraseña de la cuenta.
import { useState } from "react";
import { validarContrasena } from "../validations/configuracion";
import CampoFormulario from "./CampoFormulario";

const inicial = { actual: "", nueva: "", confirmar: "" };

/**
 * Permite actualizar la contraseña con validación básica.
 * @returns Sección de seguridad.
 */
export default function TuSeguridad() {
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");

  const cambiar = (e) => {
    setDatos((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMensaje("");
  };

  const guardar = (e) => {
    e.preventDefault();
    const nuevos = validarContrasena(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    // TODO: enviar al backend (la contraseña actual se verifica allá).
    setDatos(inicial);
    setMensaje("Contraseña actualizada.");
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Seguridad</h5>
      <p className="config-ayuda">Usa al menos 8 caracteres, combinando letras y números.</p>

      <CampoFormulario id="actual" type="password" autoComplete="current-password" label="Contraseña actual" value={datos.actual} onChange={cambiar} error={errores.actual} />
      <CampoFormulario id="nueva" type="password" autoComplete="new-password" label="Nueva contraseña" value={datos.nueva} onChange={cambiar} error={errores.nueva} />
      <CampoFormulario id="confirmar" type="password" autoComplete="new-password" label="Confirmar nueva contraseña" value={datos.confirmar} onChange={cambiar} error={errores.confirmar} />

      <button type="submit" className="btn btn-primary">Cambiar contraseña</button>
      {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
    </form>
  );
}