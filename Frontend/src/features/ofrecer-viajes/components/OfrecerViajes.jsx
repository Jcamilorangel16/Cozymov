// Coordina las vistas de vehículo, publicación y selección de pasajeros.
"use client";

import RegistroVehiculo from "./RegistroVehiculo";
import EsperandoPasajeros from "./EsperandoPasajeros";
import FormularioPublicarViaje from "./FormularioPublicarViaje";
import DetallePasajero from "./DetallePasajero";
import { useOfrecerViajes } from "../hooks/useOfrecerViajes";

/**
 * Muestra los flujos de registro de vehículo y publicación de viajes.
 * @param {object} props Pasajero seleccionado y estado de la acción local.
 * @returns Vista correspondiente al estado del conductor.
 */
export default function OfrecerViajes({
  pasajeroSeleccionado,
  setPasajeroSeleccionado,
  mensajeAccion,
  setMensajeAccion,
}) {
  const {
    idUsuario,
    vehiculoGuardado,
    cargandoVehiculo,
    consultaFallida,
    vehiculo,
    errorVehiculo,
    guardandoVehiculo,
    origen,
    setOrigen,
    destino,
    setDestino,
    puntoEncuentro,
    setPuntoEncuentro,
    precioPasaje,
    setPrecioPasaje,
    cuposDisponibles,
    setCuposDisponibles,
    informacionAdicional,
    setInformacionAdicional,
    fechaSalida,
    setFechaSalida,
    horaSalida,
    setHoraSalida,
    atajoSalida,
    setAtajoSalida,
    errorPublicacion,
    setErrorPublicacion,
    viajePublicado,
    cambiarCampoVehiculo,
    guardarVehiculo,
    publicarViaje,
    reintentarConsulta,
    editarViajePublicado,
    prepararOtroViaje,
    aceptarPasajero,
  } = useOfrecerViajes({ pasajeroSeleccionado, setMensajeAccion });

  if (!idUsuario) {
    return (
      <div className="vista">
        <div className="alert alert-danger" role="alert">
          Inicia sesión para registrar y consultar tu vehículo.
        </div>
      </div>
    );
  }

  if (cargandoVehiculo) {
    return <div className="vista" role="status">Consultando tu vehículo...</div>;
  }

  if (vehiculoGuardado === null) {
    if (consultaFallida) {
      return (
        <div className="vista">
          <div className="alert alert-danger" role="alert">
            {errorVehiculo}
            <button
              className="btn btn-outline-danger d-block mt-3"
              type="button"
              onClick={reintentarConsulta}
            >
              Volver a consultar
            </button>
          </div>
        </div>
      );
    }

    return (
      <RegistroVehiculo
        vehiculo={vehiculo}
        error={errorVehiculo}
        guardando={guardandoVehiculo}
        onFieldChange={cambiarCampoVehiculo}
        onSubmit={guardarVehiculo}
      />
    );
  }

  return (
    <div className="vista">
      {viajePublicado ? (
        <EsperandoPasajeros
          viaje={viajePublicado}
          onEditarViaje={editarViajePublicado}
          onPublicarOtro={prepararOtroViaje}
        />
      ) : pasajeroSeleccionado === null ? (
        <FormularioPublicarViaje
          origen={origen}
          setOrigen={setOrigen}
          destino={destino}
          setDestino={setDestino}
          puntoEncuentro={puntoEncuentro}
          setPuntoEncuentro={setPuntoEncuentro}
          precioPasaje={precioPasaje}
          setPrecioPasaje={setPrecioPasaje}
          cuposDisponibles={cuposDisponibles}
          setCuposDisponibles={setCuposDisponibles}
          informacionAdicional={informacionAdicional}
          setInformacionAdicional={setInformacionAdicional}
          fechaSalida={fechaSalida}
          setFechaSalida={setFechaSalida}
          horaSalida={horaSalida}
          setHoraSalida={setHoraSalida}
          atajoSalida={atajoSalida}
          setAtajoSalida={setAtajoSalida}
          errorPublicacion={errorPublicacion}
          setErrorPublicacion={setErrorPublicacion}
          onSubmit={publicarViaje}
        />
      ) : (
        <DetallePasajero
          pasajero={pasajeroSeleccionado}
          mensajeAccion={mensajeAccion}
          onAceptar={aceptarPasajero}
          onVolver={() => {
            setPasajeroSeleccionado(null);
            setMensajeAccion("");
          }}
        />
      )}
    </div>
  );
}
