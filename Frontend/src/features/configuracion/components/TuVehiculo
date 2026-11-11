"use client";

// Formulario con los datos del vehículo que se muestran al pasajero.
import { useState } from "react";
import { validarVehiculo } from "../validations/configuracion";
import CampoFormulario from "./CampoFormulario";

/**
 * Permite registrar marca, modelo, color, placa y plazas.
 * @returns Sección de vehículo.
 */
export default function TuVehiculo() {
  // TODO: cargar el vehículo guardado desde el backend.
  const [datos, setDatos] = useState({
    marca: "",
    modelo: "",
    color: "",
    placa: "",
    plazas: "3",
  });
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");

  const cambiar = (e) => {
    const { name, value } = e.target;
    setDatos((prev) => ({
      ...prev,
      [name]: name === "placa" ? value.toUpperCase() : value,
    }));
    setMensaje("");
  };

  const guardar = (e) => {
    e.preventDefault();
    const nuevos = validarVehiculo(datos);
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    // TODO: enviar `datos` al backend.
    setMensaje("Vehículo guardado.");
  };

  return (
    <form onSubmit={guardar} noValidate>
      <h5 className="config-titulo">Tu vehículo</h5>
      <p className="config-ayuda">Los pasajeros lo ven para identificarte al subir.</p>

      <div className="config-fila">
        <CampoFormulario id="marca" label="Marca" value={datos.marca} onChange={cambiar} error={errores.marca} placeholder="Mazda" />
        <CampoFormulario id="modelo" label="Modelo" value={datos.modelo} onChange={cambiar} error={errores.modelo} placeholder="2" />
      </div>
      <div className="config-fila">
        <CampoFormulario id="color" label="Color" value={datos.color} onChange={cambiar} error={errores.color} placeholder="Gris" />
        <CampoFormulario id="placa" label="Placa" value={datos.placa} onChange={cambiar} error={errores.placa} placeholder="ABC-123" maxLength={7} />
      </div>
      <CampoFormulario id="plazas" type="number" min={1} max={6} label="Plazas disponibles para pasajeros" value={datos.plazas} onChange={cambiar} error={errores.plazas} />

      <button type="submit" className="btn btn-primary">Guardar vehículo</button>
      {mensaje && <span className="config-ok" role="status">{mensaje}</span>}
    </form>
  );
}