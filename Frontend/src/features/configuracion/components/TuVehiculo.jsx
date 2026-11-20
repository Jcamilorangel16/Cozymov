"use client";

// Formulario con los datos del vehículo que se muestran al pasajero.
import { useEffect, useRef, useState } from "react";
import { validarDatosVehiculo } from "../validations/configuracion";
import CampoFormulario from "./CampoFormulario";

const SIN_VEHICULO = "No tienes registrado un Vehículo";

function aFormulario(v) {
  return {
    tipo: v.tipo ?? "",
    modelo: v.modelo ?? "",
    capacidad: String(v.capacidad ?? ""),
    numeroPuertas: v.numero_puertas != null ? String(v.numero_puertas) : "",
    modalidad: v.modalidad ?? "",
  };
}

/**
 * Carga el vehículo del usuario desde /api/vehiculo y permite editar los
 * campos que se persisten (modelo, plazas, foto y detalle según el tipo).
 * @returns Sección de vehículo.
 */
export default function TuVehiculo() {
  const [estado, setEstado] = useState("cargando"); // cargando | vacio | listo | error
  const [idVehiculo, setIdVehiculo] = useState(null);
  const [datos, setDatos] = useState(null);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [errorServidor, setErrorServidor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enCurso = useRef(false);

  useEffect(() => {
    const controlador = new AbortController();
    (async () => {
      try {
        const respuesta = await fetch("/api/vehiculo", { signal: controlador.signal });
        const cuerpo = await respuesta.json().catch(() => null);
        if (!respuesta.ok) {
          setErrorServidor(cuerpo?.error || "No se pudo cargar tu vehículo.");
          setEstado("error");
          return;
        }
        if (!cuerpo?.vehiculo) {
          setEstado("vacio");
          return;
        }
        setIdVehiculo(cuerpo.vehiculo.id_vehiculo);
        setDatos(aFormulario(cuerpo.vehiculo));
        setEstado("listo");
      } catch (error) {
        if (error.name === "AbortError") return;
        setErrorServidor("No se pudo conectar con el servidor.");
        setEstado("error");
      }
    })();
    return () => controlador.abort();
  }, []);

  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({ ...prev, [name]: value }));
    setMensaje("");
    setErrorServidor("");
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (enCurso.current) return;
    const nuevos = validarDatosVehiculo(datos);
    setErrores(nuevos);
    setMensaje("");
    setErrorServidor("");
    if (Object.keys(nuevos).length > 0) return;

    enCurso.current = true;
    setEnviando(true);
    try {
      const respuesta = await fetch("/api/vehiculo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_vehiculo: idVehiculo,
          tipo: datos.tipo,
          modelo: datos.modelo.trim(),
          capacidad: Number(datos.capacidad),
          ...(datos.tipo === "Automovil" && { numero_puertas: Number(datos.numeroPuertas) }),
          ...(datos.tipo === "Moto" && { modalidad: datos.modalidad.trim() }),
        }),
      });
      if (!respuesta.ok) {
        const cuerpo = await respuesta.json().catch(() => null);
        setErrorServidor(cuerpo?.error || "No se pudo guardar el vehículo.");
        return;
      }
      setMensaje("Vehículo guardado.");
    } catch {
      setErrorServidor("No se pudo conectar con el servidor.");
    } finally {
      enCurso.current = false;
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Tu vehículo</h5>
      <p className="config-ayuda">Los pasajeros lo ven para identificarte al subir.</p>

      {estado === "cargando" && <p role="status">Cargando tu vehículo...</p>}
      {estado === "vacio" && <p role="status">{SIN_VEHICULO}</p>}
      {estado === "error" && <p className="config-error" role="alert">{errorServidor}</p>}

      {estado === "listo" && datos && (
        <>
          <div className="config-fila">
            <CampoFormulario id="tipo" label="Tipo" value={datos.tipo} readOnly disabled />
            <CampoFormulario id="modelo" label="Modelo" value={datos.modelo} onChange={cambiar} error={errores.modelo} placeholder="Mazda 2" maxLength={50} />
          </div>
          <div className="config-fila">
            <CampoFormulario id="capacidad" type="number" min={1} label="Plazas disponibles para pasajeros" value={datos.capacidad} onChange={cambiar} error={errores.capacidad} />
            {datos.tipo === "Automovil" && (
              <CampoFormulario id="numeroPuertas" type="number" min={2} max={5} label="Número de puertas" value={datos.numeroPuertas} onChange={cambiar} error={errores.numeroPuertas} />
            )}
            {datos.tipo === "Moto" && (
              <CampoFormulario id="modalidad" label="Modalidad" value={datos.modalidad} onChange={cambiar} error={errores.modalidad} maxLength={20} />
            )}
          </div>

          {errorServidor && <p className="config-error" role="alert">{errorServidor}</p>}
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar vehículo"}
          </button>
          {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
        </>
      )}
    </form>
  );
}
