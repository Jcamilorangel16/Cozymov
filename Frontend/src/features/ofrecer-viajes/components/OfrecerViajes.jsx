"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import RegistroVehiculo from "./RegistroVehiculo";
import RegistroExitosoModal from "../../shared/components/RegistroExitosoModal";

const resultadosPasajeros = [
  {
    nombre: "Camila Castro", iniciales: "CC", avatarColor: "bg-success",
    rating: "4.8", viajes: "37", ruta: "Norte → Campus Sur",
    horario: "Hoy · 6:50 AM", punto: "Entrada Norte", personas: "2",
  },
  {
    nombre: "Luis Herrera", iniciales: "LH", avatarColor: "bg-warning",
    rating: "4.5", viajes: "12", ruta: "Norte → Campus Sur",
    horario: "Hoy · 7:10 AM", punto: "Entrada Norte", personas: "1",
  },
];

const VEHICULO_STORAGE_KEY = "cozymov-vehiculo-v2";
const suscriptoresVehiculo = new Set();
let ultimoVehiculoGuardado = null;
let ultimoVehiculoSerializado = null;

function suscribirVehiculo(callback) {
  suscriptoresVehiculo.add(callback);
  window.addEventListener("storage", callback);

  return () => {
    suscriptoresVehiculo.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function obtenerVehiculoGuardado() {
  const serializado = window.localStorage.getItem(VEHICULO_STORAGE_KEY);
  if (serializado === null) return null;
  if (serializado === ultimoVehiculoSerializado) return ultimoVehiculoGuardado;

  const vehiculoGuardado = JSON.parse(serializado);
  if (
    typeof vehiculoGuardado.tipo !== "string" ||
    typeof vehiculoGuardado.rutaCotidiana !== "string"
  ) {
    throw new Error("Los datos guardados del vehículo tienen un formato inválido.");
  }

  ultimoVehiculoSerializado = serializado;
  ultimoVehiculoGuardado = vehiculoGuardado;
  return vehiculoGuardado;
}

function notificarCambioVehiculo() {
  suscriptoresVehiculo.forEach((callback) => callback());
}

export default function OfrecerViajes({
  pasajeroSeleccionado,
  setPasajeroSeleccionado,
  mensajeAccion,
  setMensajeAccion,
}) {
  const vehiculoGuardado = useSyncExternalStore(
    suscribirVehiculo,
    obtenerVehiculoGuardado,
    () => null,
  );
  const [vehiculo, setVehiculo] = useState({
    tipo: "",
    modelo: "",
    rutaCotidiana: "",
    numeroPuertas: "",
    modalidad: "",
  });
  const [errorVehiculo, setErrorVehiculo] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState("inactivo");
  const temporizadorRegistro = useRef(null);

  useEffect(
    () => () => window.clearTimeout(temporizadorRegistro.current),
    [],
  );

  function cambiarCampoVehiculo(campo, valor) {
    setVehiculo((anterior) => {
      if (campo === "tipo") {
        return { ...anterior, tipo: valor, numeroPuertas: "", modalidad: "" };
      }

      return { ...anterior, [campo]: valor };
    });
    setErrorVehiculo("");
  }

  function guardarVehiculo(evento) {
    evento.preventDefault();
    try {
      const vehiculoParaGuardar = {
        tipo: vehiculo.tipo,
        modelo: vehiculo.modelo,
        rutaCotidiana: vehiculo.rutaCotidiana,
        ...(vehiculo.tipo === "automovil" && {
          numeroPuertas: Number(vehiculo.numeroPuertas),
        }),
        ...(vehiculo.tipo === "moto" && { modalidad: vehiculo.modalidad }),
      };
      window.localStorage.setItem(VEHICULO_STORAGE_KEY, JSON.stringify(vehiculoParaGuardar));
      ultimoVehiculoSerializado = null;
      ultimoVehiculoGuardado = null;
      notificarCambioVehiculo();
      setErrorVehiculo("");
    } catch (error) {
      console.error("No se pudo guardar el vehículo en localStorage:", error);
      setErrorVehiculo("No se pudo guardar el vehículo. Inténtalo de nuevo.");
    }
  }

  const ventanaRegistro = (
    <RegistroExitosoModal
      estado={estadoRegistro}
      entidad="vehículo"
      mensajeExitoso="Tu vehículo se registró correctamente."
      onContinuar={() => setEstadoRegistro("inactivo")}
    />
  );

  function aceptarPasajero() {
    setMensajeAccion(`Has aceptado la solicitud de ${pasajeroSeleccionado.nombre}.`);
  }

  if (vehiculoGuardado === null) {
    return (
      <>
        <RegistroVehiculo
          vehiculo={vehiculo}
          error={errorVehiculo}
          onFieldChange={cambiarCampoVehiculo}
          onSubmit={guardarVehiculo}
        />
        {ventanaRegistro}
      </>
    );
  }

  return (
    <div className="vista">
      {ventanaRegistro}
      {pasajeroSeleccionado === null ? (
        <div>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <h3 className="mb-0 letra-contenido">Ofrecer Viaje</h3>
          </div>

          <p className="texto-secundario fw-semibold mb-3">{resultadosPasajeros.length} Posibles pasajeros</p>

          <div className="row g-3">
            {resultadosPasajeros.map((pasajero, indice) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={indice}>
                <div
                  className="card p-3 color-card h-100"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setPasajeroSeleccionado(pasajero);
                    setMensajeAccion("");
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className={"user-avatar " + pasajero.avatarColor}
                        style={{ width: 38, height: 38, fontSize: 13 }}
                      >
                        {pasajero.iniciales}
                      </div>
                      <div>
                        <div className="fw-bold letra-contenido">{pasajero.nombre}</div>
                        <small className="texto-secundario">★ {pasajero.rating} · {pasajero.viajes} viajes</small>
                      </div>
                    </div>
                    <span className="fs-4 texto-secundario">›</span>
                  </div>

                  <div className="texto-secundario small mt-2">
                    <span>◉ {pasajero.ruta}</span>
                  </div>

                  <div className="mt-2 d-flex justify-content-between align-items-center">
                    <span className="badge bg-primary">{pasajero.personas} persona(s)</span>
                    <small className="texto-secundario">{pasajero.horario}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-link texto-secundario ps-0 mb-3"
            onClick={() => {
              setPasajeroSeleccionado(null);
              setMensajeAccion("");
            }}
          >
            ‹ Volver a pasajeros
          </button>

          <div className="row g-3">
            <div className="col-lg-5">
              <div className="card p-3 color-card">
                <h5 className="letra-contenido mb-0">{pasajeroSeleccionado.ruta}</h5>
                <small className="texto-secundario d-block mb-3">{pasajeroSeleccionado.horario}</small>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className={"user-avatar " + pasajeroSeleccionado.avatarColor}
                    style={{ width: 42, height: 42 }}
                  >
                    {pasajeroSeleccionado.iniciales}
                  </div>
                  <div>
                    <div className="fw-semibold letra-contenido">{pasajeroSeleccionado.nombre}</div>
                    <small className="texto-secundario">★ {pasajeroSeleccionado.rating} · {pasajeroSeleccionado.viajes} viajes</small>
                  </div>
                </div>

                <small className="texto-secundario d-block">Punto de encuentro</small>
                <p className="fw-semibold mb-2" style={{ color: "#a03c3c" }}>{pasajeroSeleccionado.punto}</p>

                <small className="texto-secundario d-block">Personas que viajan</small>
                <p className="fw-semibold mb-3" style={{ color: "#1457e7" }}>{pasajeroSeleccionado.personas} persona(s)</p>

                <button type="button" className="btn btn-primary w-100" onClick={aceptarPasajero}>
                  Aceptar Pasajero
                </button>
                {mensajeAccion && <p className="alert alert-success mt-3 mb-0">{mensajeAccion}</p>}
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card color-card p-3 h-100 d-flex align-items-center justify-content-center text-center">
                <div style={{ fontSize: "3.5rem" }}>🗺️</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
