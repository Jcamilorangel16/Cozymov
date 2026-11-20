"use client";

// Formulario con los datos públicos del usuario.
import { useRef, useState } from "react";
import Image from "next/image";
import { validarFoto } from "../validations/configuracion";
import { usePerfil } from "../context/PerfilContext";
import CampoFormulario from "./CampoFormulario";
import {
  MAX_DESCRIPCION,
  prepararFotoPerfil,
} from "../../perfil-publico/utils/perfil";

/**
 * Permite editar la foto y la descripción que otros usuarios ven en el perfil
 * público. El nombre y la ocupación son los del registro.
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
  const inicial = { descripcion: perfil.descripcion ?? "", foto: perfil.fotoUrl ?? null };

  const [descripcion, setDescripcion] = useState(inicial.descripcion);
  const [foto, setFoto] = useState(inicial.foto); // data URL o null
  const [guardado, setGuardado] = useState(inicial);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  const inputFoto = useRef(null);

  const elegirFoto = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const error = validarFoto(archivo);
    if (error) {
      setErrores((prev) => ({ ...prev, foto: error }));
      return;
    }
    try {
      // Se guarda reducida a 256 px para que pese pocos KB.
      setFoto(await prepararFotoPerfil(archivo));
      setErrores((prev) => ({ ...prev, foto: undefined }));
    } catch {
      setErrores((prev) => ({ ...prev, foto: "No se pudo leer la imagen." }));
    }
    setMensaje("");
  };

  const quitarFoto = () => {
    setFoto(null);
    setErrores((prev) => ({ ...prev, foto: undefined }));
    setMensaje("");
  };

  const restablecer = () => {
    setDescripcion(guardado.descripcion);
    setFoto(guardado.foto);
    setErrores({});
    setMensaje("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (descripcion.trim().length > MAX_DESCRIPCION) {
      setErrores({ descripcion: `Máximo ${MAX_DESCRIPCION} caracteres.` });
      return;
    }
    setErrores({});
    setMensaje("");
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descripcion: descripcion.trim() || null, fotoPerfil: foto }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => null);
        throw new Error(datos?.error || "No se pudo guardar tu perfil.");
      }
      const nuevo = { descripcion: descripcion.trim(), foto };
      setDescripcion(nuevo.descripcion);
      setGuardado(nuevo);
      setPerfil((prev) => ({ ...prev, fotoUrl: foto, descripcion: nuevo.descripcion }));
      setMensaje("Perfil actualizado.");
    } catch (error) {
      setErrores({ general: error.message || "No se pudo guardar tu perfil." });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Tu perfil</h5>
      <p className="config-ayuda">
        Esto es lo que ven otros usuarios cuando abren tu perfil desde un viaje o una solicitud,
        junto con tus reseñas.
      </p>
      {errorPerfil && <div className="alert alert-danger" role="alert">{errorPerfil}</div>}
      {errores.general && <div className="alert alert-danger" role="alert">{errores.general}</div>}

      <div className="config-foto">
        <div className="config-avatar" aria-hidden={!foto}>
          {foto ? (
            <Image
              src={foto}
              alt="Tu foto de perfil"
              width={72}
              height={72}
              unoptimized
            />
          ) : (
            perfil.nombre.trim().charAt(0).toUpperCase() || "A"
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

      <CampoFormulario id="nombre" label="Nombre" value={perfil.nombre} readOnly disabled />
      {perfil.ocupacion && (
        <CampoFormulario id="ocupacion" label="Ocupación" value={perfil.ocupacion} readOnly disabled />
      )}
      <CampoFormulario
        id="descripcion"
        as="textarea"
        rows={3}
        label={`Descripción (${descripcion.length}/${MAX_DESCRIPCION})`}
        value={descripcion}
        onChange={(e) => {
          setDescripcion(e.target.value);
          setMensaje("");
        }}
        error={errores.descripcion}
        maxLength={MAX_DESCRIPCION}
        placeholder="Cuéntales algo breve sobre ti"
      />

      <div className="config-acciones">
        <button type="button" className="btn btn-outline-secondary" onClick={restablecer} disabled={guardando}>
          Restablecer
        </button>
        <button type="submit" className="btn btn-primary" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar cambios"}
        </button>
        {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
      </div>
    </form>
  );
}
