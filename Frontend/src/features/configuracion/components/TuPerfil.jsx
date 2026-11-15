"use client";

// Formulario con los datos públicos del usuario.
import { useRef, useState } from "react";
import Image from "next/image";
import { validarPerfil, validarFoto } from "../validations/configuracion";
import { usePerfil } from "../context/PerfilContext";
import CampoFormulario from "./CampoFormulario";

/**
 * Permite editar foto, nombre, programa y descripción.
 * @returns Sección de perfil.
 */
export default function TuPerfil() {
  const { perfil, setPerfil, loading, error: errorPerfil } = usePerfil();

  if (loading) {
    return (
      <>
        <h5 className="config-titulo">Tu perfil</h5>
        <p className="config-ayuda">Esto es lo que ven otros usuarios al reservar contigo.</p>
        <p role="status">Cargando los datos de tu perfil...</p>
      </>
    );
  }

  return (
    <FormularioPerfil
      perfil={perfil}
      setPerfil={setPerfil}
      errorPerfil={errorPerfil}
    />
  );
}

function FormularioPerfil({ perfil, setPerfil, errorPerfil }) {

  // Al volver a esta sección se parte de lo ya guardado en el contexto.
  // TODO: programa y descripción vendrán del backend.
  const inicial = {
    nombre: perfil.nombre,
    programa: "",
    descripcion: "",
  };
  const fotoInicial = perfil.fotoUrl ? { archivo: null, url: perfil.fotoUrl } : null;

  const [datos, setDatos] = useState(inicial);
  const [foto, setFoto] = useState(fotoInicial); // { archivo, url } o null
  const [guardado, setGuardado] = useState({ datos: inicial, foto: fotoInicial });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");

  const inputFoto = useRef(null);

  const cambiar = (e) => {
    setDatos((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setMensaje("");
  };

  const elegirFoto = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const error = validarFoto(archivo);
    if (error) {
      setErrores((prev) => ({ ...prev, foto: error }));
      return;
    }
    // La URL no se revoca: la barra superior también la usa.
    const url = URL.createObjectURL(archivo);
    setFoto({ archivo, url });
    setErrores((prev) => ({ ...prev, foto: undefined }));
    setMensaje("");
  };

  const quitarFoto = () => {
    setFoto(null);
    setErrores((prev) => ({ ...prev, foto: undefined }));
    setMensaje("");
  };

  const restablecer = () => {
    setDatos(guardado.datos);
    setFoto(guardado.foto);
    setErrores({});
    setMensaje("");
  };

  const guardar = (e) => {
    e.preventDefault();
    const nuevos = validarPerfil(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    // TODO: enviar `datos` y `foto?.archivo` al backend (FormData).
    setGuardado({ datos, foto });
    setPerfil({ nombre: datos.nombre, fotoUrl: foto?.url ?? null });
    setMensaje("Perfil actualizado.");
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Tu perfil</h5>
      <p className="config-ayuda">Esto es lo que ven otros usuarios al reservar contigo.</p>
      {errorPerfil && <div className="alert alert-danger" role="alert">{errorPerfil}</div>}

      <div className="config-foto">
        <div className="config-avatar" aria-hidden={!foto}>
          {foto ? (
            <Image
              src={foto.url}
              alt="Tu foto de perfil"
              width={72}
              height={72}
              unoptimized
            />
          ) : (
            datos.nombre.trim().charAt(0).toUpperCase() || "A"
          )}
        </div>

        <div>
          <input
            ref={inputFoto}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={elegirFoto}
            hidden
          />
          <div className="config-acciones">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={() => inputFoto.current?.click()}
            >
              Cambiar foto
            </button>
            {foto && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={quitarFoto}
              >
                Quitar
              </button>
            )}
          </div>
          <small className="config-ayuda d-block mt-1">JPG, PNG o WEBP · máx. 2 MB</small>
          {errores.foto && (
            <small className="config-error" role="alert">{errores.foto}</small>
          )}
        </div>
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

      <div className="config-acciones">
        <button type="button" className="btn btn-outline-secondary" onClick={restablecer}>
          Restablecer
        </button>
        <button type="submit" className="btn btn-primary">Guardar cambios</button>
        {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
      </div>
    </form>
  );
}