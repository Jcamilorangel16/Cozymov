"use client";

// Formulario para cambiar la contraseña de la cuenta.
import { useRef, useState } from "react";
import { validarContrasena } from "../validations/configuracion";
import CampoFormulario from "./CampoFormulario";

const inicial = { actual: "", nueva: "", confirmar: "" };

/**
 * Actualiza la contraseña mediante /api/usuario/contrasena; el servidor
 * verifica la contraseña actual.
 * @returns Sección de seguridad.
 */
export default function TuSeguridad() {
  const [datos, setDatos] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);

  const cambiar = (e) => {
    setDatos((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMensaje("");
    setErrorServidor("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (enCurso.current) return;
    const nuevos = validarContrasena(datos);
    setErrores(nuevos);
    setMensaje("");
    setErrorServidor("");
    if (Object.keys(nuevos).length > 0) return;

    enCurso.current = true;
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/usuario/contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contrasenaActual: datos.actual,
          nuevaContrasena: datos.nueva,
        }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setErrorServidor(cuerpo?.error || "No se pudo cambiar la contraseña.");
        return;
      }
      setDatos(inicial);
      setMensaje("Contraseña actualizada.");
    } catch {
      setErrorServidor("No se pudo conectar con el servidor.");
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Seguridad</h5>
      <p className="config-ayuda">Usa al menos 8 caracteres, combinando letras y números.</p>

      <CampoFormulario id="actual" type="password" autoComplete="current-password" label="Contraseña actual" value={datos.actual} onChange={cambiar} error={errores.actual} />
      <CampoFormulario id="nueva" type="password" autoComplete="new-password" label="Nueva contraseña" value={datos.nueva} onChange={cambiar} error={errores.nueva} />
      <CampoFormulario id="confirmar" type="password" autoComplete="new-password" label="Confirmar nueva contraseña" value={datos.confirmar} onChange={cambiar} error={errores.confirmar} />

      {errorServidor && <p className="config-error" role="alert">{errorServidor}</p>}
      <button type="submit" className="btn btn-primary" disabled={enviando}>
        {enviando ? "Guardando..." : "Cambiar contraseña"}
      </button>
      {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
    </form>
  );
}
