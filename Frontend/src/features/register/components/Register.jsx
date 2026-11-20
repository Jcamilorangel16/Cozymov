// Compone las secciones personales y de credenciales del registro.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import DatosPersonalesRegistro from "./DatosPersonalesRegistro";
import CredencialesRegistro from "./CredencialesRegistro";
import BotonGoogle from "../../../components/BotonGoogle";
import { useBorradorRegistro, useRegisterForm } from "../hooks/useRegisterForm";
import "../styles/register.css";

/**
 * Presenta el formulario de creación de cuenta.
 * @param {{correoVerificado?: string, errorVerificacion?: string}} props Correo
 *   que Google ya confirmó y error del último intento de verificación.
 * @returns Interfaz de registro de usuario.
 */
export default function Register({ correoVerificado = "", errorVerificacion = "" }) {
  const router = useRouter();
  const borrador = useBorradorRegistro();

  // Al volver de Google: muestra el error, si lo hubo, y limpia la URL.
  useEffect(() => {
    if (errorVerificacion) void Swal.fire({ icon: "error", text: errorVerificacion });
    if (window.location.search) router.replace("/register");
  }, [errorVerificacion, router]);

  // El borrador solo existe en el navegador: al leerlo tras la hidratación,
  // la key remonta el formulario con lo que el usuario había escrito.
  return (
    <FormularioRegistro
      key={borrador ? "con-borrador" : "sin-borrador"}
      correoVerificado={correoVerificado}
      borrador={borrador}
    />
  );
}

/**
 * Formulario de registro; sus valores iniciales salen del borrador y del
 * correo verificado.
 * @param {{correoVerificado: string, borrador: object|null}} props Valores iniciales.
 * @returns Tarjeta con el formulario.
 */
function FormularioRegistro({ correoVerificado, borrador }) {
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
    correoEstaVerificado,
    verificarCorreo,
    manejarCambio,
    manejarTeclado,
    manejarSiguiente,
  } = useRegisterForm({ correoVerificado, borrador });

  return (
    <div className="register-page d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow rounded-4 p-4 register-card">
        <h2 className="display-6 text-center fw-bold text-primary mb-3">Cozymov</h2>
        <h1 className="text-center mb-3 titulo-icono"><i className="bi bi-person-heart" aria-hidden="true" /> Crear cuenta</h1>
        <h5 className="text-center text-muted mb-4">Únete a nosotros y empieza tu viaje</h5>

        <div className="d-grid gap-2 mb-3">
          <BotonGoogle texto="Registrarse con Google" deshabilitado={guardando} />
          <p className="small text-muted text-center mb-0">
            Solo con tu correo @unicesar.edu.co
          </p>
        </div>
        <div className="separador-google mb-3" role="separator" aria-label="o">
          <span>o</span>
        </div>

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
            correoEstaVerificado={correoEstaVerificado}
            verificarCorreo={verificarCorreo}
            manejarCambio={manejarCambio}
            manejarTeclado={manejarTeclado}
            manejarSiguiente={manejarSiguiente}
          />
        </div>
      </div>
    </div>
  );
}
