// Restablece la contraseña con un código de 6 dígitos enviado por correo.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import BotonVerContrasena from "../../../components/BotonVerContrasena";
import { ESPERA_REENVIO_MS, solicitarCodigo } from "../../../lib/codigoCorreoCliente";
import "../../login/styles/Login.css";

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mostrarError(mensaje) {
  void Swal.fire({ icon: "error", text: mensaje });
}

/**
 * Paso 1: el usuario escribe su correo y recibe un código.
 * Paso 2: escribe el código y la contraseña nueva (puede reenviar el código).
 * @returns Pantalla de recuperación de contraseña.
 */
export default function RecuperarContrasena() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [correoEnviado, setCorreoEnviado] = useState("");
  const [codigo, setCodigo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);
  const campoCodigo = useRef(null);

  // Cuenta regresiva para poder reenviar el código.
  useEffect(() => {
    if (espera <= 0) return undefined;
    const id = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [espera]);

  async function enviarCodigo(destino) {
    setOcupado(true);
    try {
      const envio = await solicitarCodigo(destino, "recuperacion");
      if (!envio.ok) {
        if (typeof envio.esperar === "number") setEspera(envio.esperar);
        mostrarError(envio.error);
        return false;
      }
      setEspera(ESPERA_REENVIO_MS / 1000);
      void Swal.fire({ icon: "info", text: envio.mensaje });
      return true;
    } finally {
      setOcupado(false);
    }
  }

  async function manejarEnvioCorreo(evento) {
    evento.preventDefault();
    if (ocupado) return;
    const normalizado = correo.replace(/\s+/g, "").toLowerCase();
    if (!FORMATO_CORREO.test(normalizado)) {
      mostrarError("Ingresa un correo electrónico válido.");
      return;
    }
    if (await enviarCodigo(normalizado)) {
      setCorreoEnviado(normalizado);
      window.setTimeout(() => campoCodigo.current?.focus(), 0);
    }
  }

  async function manejarRestablecer(evento) {
    evento.preventDefault();
    if (ocupado) return;
    if (codigo.length !== 6) {
      mostrarError("Escribe el código de 6 dígitos que te llegó al correo.");
      return;
    }
    if (contrasena.length < 8 || new TextEncoder().encode(contrasena).length > 72) {
      mostrarError("La contraseña debe tener entre 8 y 72 bytes.");
      return;
    }
    if (contrasena !== confirmacion) {
      mostrarError("Las contraseñas no coinciden.");
      return;
    }

    setOcupado(true);
    try {
      const respuesta = await fetch("/api/recuperacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correoEnviado, codigo, nuevaContrasena: contrasena }),
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        mostrarError(resultado.error || "No se pudo cambiar la contraseña.");
        return;
      }
      await Swal.fire({
        icon: "success",
        title: "Contraseña cambiada",
        text: resultado.mensaje || "Ya puedes iniciar sesión con tu contraseña nueva.",
        confirmButtonText: "Iniciar sesión",
        allowOutsideClick: false,
      });
      router.replace("/");
    } catch {
      mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="container min-vh-100 d-flex justify-content-center align-items-center">
      <div className="contenedor d-flex flex-column justify-content-center align-items-center p-4">
        <div className="logo mb-3">COZYMOV</div>
        <h5 className="titulo mb-4">Restablecer contraseña</h5>

        {!correoEnviado ? (
          <form className="formulario" onSubmit={manejarEnvioCorreo}>
            <p className="small text-muted">
              Escribe el correo de tu cuenta y te enviaremos un código de 6 dígitos.
            </p>
            <div className="mb-3">
              <label htmlFor="correo-recuperacion" className="form-label">Correo electrónico</label>
              <input
                id="correo-recuperacion"
                type="email"
                className="form-control"
                placeholder="Ingrese su correo"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                disabled={ocupado}
                required
              />
            </div>
            <div className="d-grid gap-3">
              <button type="submit" className="btn btn-login" disabled={ocupado || espera > 0} aria-busy={ocupado}>
                {ocupado ? "Enviando..." : espera > 0 ? `Enviar código (${espera} s)` : "Enviar código"}
              </button>
              <Link href="/" className="btn btn-crear">Volver al inicio de sesión</Link>
            </div>
          </form>
        ) : (
          <form className="formulario" onSubmit={manejarRestablecer}>
            <p className="small text-muted">
              Si <strong>{correoEnviado}</strong> tiene una cuenta, le enviamos un código. Revisa
              también la carpeta de correo no deseado.
            </p>
            <div className="mb-3">
              <label htmlFor="codigo-recuperacion" className="form-label">Código</label>
              <input
                id="codigo-recuperacion"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="form-control"
                placeholder="123456"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                ref={campoCodigo}
                disabled={ocupado}
                required
              />
              <button
                type="button"
                className="btn btn-link btn-sm px-0"
                onClick={() => void enviarCodigo(correoEnviado)}
                disabled={ocupado || espera > 0}
              >
                {espera > 0 ? `Reenviar código (${espera} s)` : "Reenviar código"}
              </button>
            </div>
            <div className="mb-3">
              <label htmlFor="nueva-contrasena" className="form-label">Contraseña nueva</label>
              <div className="input-group">
                <input
                  id="nueva-contrasena"
                  type={verContrasena ? "text" : "password"}
                  className="form-control"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  disabled={ocupado}
                  required
                />
                <BotonVerContrasena
                  visible={verContrasena}
                  onAlternar={() => setVerContrasena((v) => !v)}
                  controla="nueva-contrasena"
                  disabled={ocupado}
                />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="confirmar-nueva-contrasena" className="form-label">Confirmar contraseña</label>
              <div className="input-group">
                <input
                  id="confirmar-nueva-contrasena"
                  type={verConfirmacion ? "text" : "password"}
                  className="form-control"
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(e) => setConfirmacion(e.target.value)}
                  disabled={ocupado}
                  required
                />
                <BotonVerContrasena
                  visible={verConfirmacion}
                  onAlternar={() => setVerConfirmacion((v) => !v)}
                  controla="confirmar-nueva-contrasena"
                  disabled={ocupado}
                />
              </div>
            </div>
            <div className="d-grid gap-3">
              <button type="submit" className="btn btn-login" disabled={ocupado} aria-busy={ocupado}>
                Cambiar contraseña
              </button>
              <button
                type="button"
                className="btn btn-crear"
                onClick={() => {
                  setCorreoEnviado("");
                  setCodigo("");
                }}
                disabled={ocupado}
              >
                Usar otro correo
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
