// Presenta el formulario de registro de un vehículo del conductor.
"use client";

import { useState } from "react";
import "../styles/RegistroVehiculo.css";
import RutaCotidianaSelect from "./RutaCotidianaSelect";
import CampoArchivo from "./CampoArchivo";
import CamposBicicleta from "./CamposBicicleta";
import CamposMotoAutomovil from "./CamposMotoAutomovil";

/**
 * Renderiza los datos requeridos para guardar el vehículo.
 * @param {object} props Estado del vehículo, errores y acciones del formulario.
 * @returns Formulario de registro de vehículo.
 */
export default function RegistroVehiculo({
  vehiculo,
  error,
  guardando,
  onFieldChange,
  onSubmit,
}) {
  const [mostrarErroresRequeridos, setMostrarErroresRequeridos] = useState(false);

  return (
    <div className="vista d-flex justify-content-center py-4">
      <form
        className="registro-vehiculo__card w-100 p-4 p-md-5 border rounded-4 shadow"
        onSubmit={onSubmit}
        onInvalidCapture={() => setMostrarErroresRequeridos(true)}
      >
        <div className="d-flex align-items-center gap-3 mb-4">
          <span className="registro-vehiculo__icon d-flex align-items-center justify-content-center flex-shrink-0 rounded-4" aria-hidden="true">🚘</span>
          <div>
            <h3 className="h4 fw-bold mb-1 titulo-icono"><i className="bi bi-car-front-fill" aria-hidden="true" /> Registra tu vehículo</h3>
            <p className="text-secondary mb-0">
              Completa los datos para empezar a ofrecer viajes.
            </p>
          </div>
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="tipo-vehiculo">Tipo de vehículo</label>
          <select
            className="form-select rounded-3"
            id="tipo-vehiculo"
            required
            value={vehiculo.tipo}
            onChange={(evento) => onFieldChange("tipo", evento.target.value)}
          >
            <option value="" disabled>Selecciona un tipo</option>
            <option value="Automovil">Automóvil</option>
            <option value="Moto">Moto</option>
            <option value="Bicicleta electrica">Bicicleta eléctrica</option>
          </select>
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="marca-vehiculo">Marca</label>
          <input
            className="form-control"
            id="marca-vehiculo"
            type="text"
            required
            value={vehiculo.marca}
            onChange={(evento) => onFieldChange("marca", evento.target.value)}
          />
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="modelo-vehiculo">Modelo</label>
          <input
            className="form-control"
            id="modelo-vehiculo"
            type="text"
            required
            value={vehiculo.modelo}
            onChange={(evento) => onFieldChange("modelo", evento.target.value)}
          />
        </div>

        <div className="registro-vehiculo__field">
          <label className="form-label" htmlFor="capacidad-vehiculo">Capacidad de pasajeros</label>
          <input
            className="form-control"
            id="capacidad-vehiculo"
            type="number"
            min="1"
            max="32767"
            step="1"
            required
            value={vehiculo.capacidad}
            onChange={(evento) => onFieldChange("capacidad", evento.target.value)}
          />
        </div>

        {vehiculo.tipo === "Bicicleta electrica" && (
          <CamposBicicleta vehiculo={vehiculo} onFieldChange={onFieldChange} />
        )}

        {["Automovil", "Moto"].includes(vehiculo.tipo) && (
          <CamposMotoAutomovil
            tipo={vehiculo.tipo}
            vehiculo={vehiculo}
            onFieldChange={onFieldChange}
            mostrarErroresRequeridos={mostrarErroresRequeridos}
          />
        )}

        <div className="registro-vehiculo__fotos">
          <CampoArchivo
            id="foto-frontal"
            label="Foto frontal"
            tipoArchivo="imagen"
            archivo={vehiculo.fotoFrontal}
            mostrarErrorRequerido={mostrarErroresRequeridos}
            onChange={(archivo) => onFieldChange("fotoFrontal", archivo)}
          />
          <CampoArchivo
            id="foto-lateral"
            label="Foto lateral"
            tipoArchivo="imagen"
            archivo={vehiculo.fotoLateral}
            mostrarErrorRequerido={mostrarErroresRequeridos}
            onChange={(archivo) => onFieldChange("fotoLateral", archivo)}
          />
          <CampoArchivo
            id="foto-perfil"
            label="Foto de perfil"
            tipoArchivo="imagen"
            archivo={vehiculo.fotoPerfil}
            mostrarErrorRequerido={mostrarErroresRequeridos}
            onChange={(archivo) => onFieldChange("fotoPerfil", archivo)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold" htmlFor="ruta-cotidiana">Ruta cotidiana</label>
          <RutaCotidianaSelect
            id="ruta-cotidiana"
            value={vehiculo.rutaCotidiana}
            onChange={(valor) => onFieldChange("rutaCotidiana", valor)}
          />
          <small className="d-block mt-1 text-secondary">
            Selecciona el barrio o sector de origen de tu ruta cotidiana hacia la Universidad Popular Del Cesar.
          </small>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 fw-bold py-2"
          disabled={guardando}
        >
          {guardando ? "Guardando vehículo..." : "Guardar vehículo"}
        </button>
      </form>
    </div>
  );
}
