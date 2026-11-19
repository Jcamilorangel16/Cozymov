// Compone las secciones personales y de credenciales del registro.
"use client";

import DatosPersonalesRegistro from "./DatosPersonalesRegistro";
import CredencialesRegistro from "./CredencialesRegistro";
import PasoVerificacionCorreo from "./PasoVerificacionCorreo";
import { useRegisterForm } from "../hooks/useRegisterForm";
import "../styles/register.css";

/**
 * Presenta el formulario de creación de cuenta.
 * @returns Interfaz de registro de usuario.
 */
export default function Register() {
  const {
    asignarRef,
    enfocarCampo,
    datosUsuario,
    tipoOcupacion,
    setTipoOcupacion,
    ocupacionOtro,
    setOcupacionOtro,
    confirmarContrasena,
    setConfirmarContrasena,
    guardando,
    pasoCorreo,
    volverADatos,
    manejarCambio,
    manejarTeclado,
    manejarSiguiente,
    codigoVerificacion,
    setCodigoVerificacion,
    enviandoCodigo,
    verificandoCodigo,
    errorVerificacion,
    mensajeVerificacion,
    solicitarCodigo,
    verificarCodigo,
  } = useRegisterForm();

  return (
    <div className="register-page d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow rounded-4 p-4 register-card">
        <h2 className="display-6 text-center fw-bold text-primary mb-3">Cozymov</h2>
        {pasoCorreo ? (
          <PasoVerificacionCorreo
            correo={datosUsuario.correo.trim().toLowerCase()}
            codigo={codigoVerificacion}
            setCodigo={setCodigoVerificacion}
            enviandoCodigo={enviandoCodigo}
            verificandoCodigo={verificandoCodigo || guardando}
            error={errorVerificacion}
            mensaje={mensajeVerificacion}
            onVerificar={verificarCodigo}
            onReenviar={solicitarCodigo}
            onAtras={volverADatos}
          />
        ) : (
          <>
            <h1 className="text-center mb-3 titulo-icono"><i className="bi bi-person-heart" aria-hidden="true" /> Crear cuenta</h1>
            <h5 className="text-center text-muted mb-4">Únete a nosotros y empieza tu viaje</h5>

            <div className="row g-3">
              <DatosPersonalesRegistro
                asignarRef={asignarRef}
                enfocarCampo={enfocarCampo}
                datosUsuario={datosUsuario}
                tipoOcupacion={tipoOcupacion}
                setTipoOcupacion={setTipoOcupacion}
                ocupacionOtro={ocupacionOtro}
                setOcupacionOtro={setOcupacionOtro}
                manejarCambio={manejarCambio}
                manejarTeclado={manejarTeclado}
              />
              <CredencialesRegistro
                asignarRef={asignarRef}
                datosUsuario={datosUsuario}
                confirmarContrasena={confirmarContrasena}
                setConfirmarContrasena={setConfirmarContrasena}
                guardando={guardando}
                enviandoCodigo={enviandoCodigo}
                manejarCambio={manejarCambio}
                manejarTeclado={manejarTeclado}
                manejarSiguiente={manejarSiguiente}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
