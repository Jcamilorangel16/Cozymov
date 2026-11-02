"use client";

// Formulario con los datos públicos del usuario.
import { useState } from "react";
import { validarPerfil } from "../validations/configuracion";
import CampoFormulario from "./CampoFormulario";

/**
 * Permite editar nombre, programa y descripción.
 * @returns Sección de perfil.
 */
export default function TuPerfil() {
  // TODO: cargar estos valores desde tu servicio/backend.
  const [datos, setDatos] = useState({
    nombre: "Alejandro",
    programa: "",
    descripcion: "",
  });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");

  const cambiar = (e) => {
    setDatos((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMensaje("");
  };

  const guardar = (e) => {
    e.preventDefault();
    const nuevos = validarPerfil(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    // TODO: enviar `datos` al backend.
    setMensaje("Perfil actualizado.");
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Tu perfil</h5>
      <p className="config-ayuda">Esto es lo que ven otros usuarios al reservar contigo.</p>

      <div className="config-avatar" aria-hidden="true">
        {datos.nombre.trim().charAt(0).toUpperCase() || "A"}
      </div>

      <CampoFormulario id="nombre" label="Nombre completo" value={datos.nombre} onChange={cambiar} error={errores.nombre} />
      <CampoFormulario id="programa" label="Programa o facultad" value={datos.programa} onChange={cambiar} placeholder="Ej. Ingeniería de Sistemas" />
      <CampoFormulario
        id="descripcion"
        as="textarea"
        rows={3}
        label={`Descripción (${datos.descripcion.length}/160)`}
        value={datos.descripcion}
        onChange={cambiar}
        error={errores.descripcion}
        placeholder="Cuéntales algo breve sobre ti"
      />

      <button type="submit" className="btn btn-primary">Guardar cambios</button>
      {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
    </form>
  );
}