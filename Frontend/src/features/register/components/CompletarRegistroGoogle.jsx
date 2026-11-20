// Pide los datos que Google no proporciona para terminar de crear la cuenta.
"use client";

import { useState } from "react";
import Link from "next/link";
import DatosPersonalesRegistro from "./DatosPersonalesRegistro";
import BotonVerContrasena from "../../../components/BotonVerContrasena";
import { useRegistroGoogle } from "../hooks/useRegistroGoogle";
import "../styles/register.css";

/**
 * Formulario obligatorio para completar el registro con Google: datos
 * personales, celular y una contraseña para entrar también sin Google.
 * @param {{correo: string, nombres: object}} props Correo verificado por Google
 *   y nombres para precargar.
 * @returns Interfaz para completar el registro.
 */
export default function CompletarRegistroGoogle({ correo, nombres }) {
  const [verContrasena, setVerContrasena] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
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
    manejarCambio,
    manejarTeclado,
    crearCuenta,
  } = useRegistroGoogle(nombres);

  return (
    <div className="register-page d-flex justify-content-center align-items-center min-vh-100">
      <div className="card shadow rounded-4 p-4 register-card">
        <h2 className="display-6 text-center fw-bold text-primary mb-3">Cozymov</h2>
        <h1 className="text-center mb-3 titulo-icono">
          <i className="bi bi-google" aria-hidden="true" /> Completa tu registro
        </h1>
        <h5 className="text-center text-muted mb-4">
          Aún no tienes cuenta. Completa tus datos y crea una contraseña para terminar.
        </h5>

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
          <div className="col-md-6">
            <label htmlFor="correo-google" className="form-label">Correo Institucional</label>
            <input
              id="correo-google"
              type="email"
              className="form-control"
              value={correo}
              readOnly
              aria-describedby="correo-google-ayuda"
            />
            <div id="correo-google-ayuda" className="form-text">
              Verificado por Google. Tu cuenta usará este correo.
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="contrasena" className="form-label">Contraseña</label>
            <div className="input-group">
              <input
                id="contrasena"
                name="contrasena"
                type={verContrasena ? "text" : "password"}
                className="form-control"
                placeholder=" 🔒 Crea una contraseña"
                autoComplete="new-password"
                aria-describedby="contrasena-ayuda"
                value={datosUsuario.contrasena}
                onChange={manejarCambio}
                onKeyDown={(e) => manejarTeclado(e, "contrasena")}
                ref={asignarRef("contrasena")}
                disabled={guardando}
              />
              <BotonVerContrasena
                visible={verContrasena}
                onAlternar={() => setVerContrasena((v) => !v)}
                controla="contrasena"
                disabled={guardando}
              />
            </div>
            <div id="contrasena-ayuda" className="form-text">Mínimo 8 caracteres.</div>
          </div>
          <div className="col-md-6">
            <label htmlFor="confirmar-contrasena" className="form-label">Confirmar Contraseña</label>
            <div className="input-group">
              <input
                id="confirmar-contrasena"
                name="confirmar-contrasena"
                type={verConfirmacion ? "text" : "password"}
                className="form-control"
                placeholder=" 🔒 Confirma tu contraseña"
                autoComplete="new-password"
                value={confirmarContrasena}
                onChange={(e) => setConfirmarContrasena(e.target.value)}
                onKeyDown={(e) => manejarTeclado(e, "confirmar-contrasena")}
                ref={asignarRef("confirmar-contrasena")}
                disabled={guardando}
              />
              <BotonVerContrasena
                visible={verConfirmacion}
                onAlternar={() => setVerConfirmacion((v) => !v)}
                controla="confirmar-contrasena"
                disabled={guardando}
              />
            </div>
          </div>
          <div className="col-12">
            <button
              id="crear-cuenta"
              type="button"
              className="btn btn-primary w-100 mt-3"
              onClick={crearCuenta}
              disabled={guardando}
            >
              {guardando ? "Procesando..." : "Crear cuenta"}
            </button>
            <Link href="/" className="btn btn-link w-100 mt-2">
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
