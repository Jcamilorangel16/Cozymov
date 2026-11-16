"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

/**
 * Llama al proxy de recuperación de contraseña.
 * @param {object} cuerpo Acción y campos para el proxy.
 * @returns {Promise<object>} Respuesta JSON del servidor.
 */
async function llamarApi(cuerpo) {
  const respuesta = await fetch("/api/recuperar-contraseña", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(datos?.error ?? "No se pudo completar la solicitud.");
  }
  return datos;
}

export default function RecuperarContrasenaView() {
  const router = useRouter();
  const [paso, setPaso] = useState(1); // 1: Solicitar correo, 2: Ingresar código y nueva contraseña
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Paso 1: Enviar solicitud de código al correo
  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError("");

    setCargando(true);
    try {
      await llamarApi({ accion: "solicitar", correo: correo.trim() });

      void Swal.fire({
        icon: "success",
        title: "Solicitud recibida",
        text: "Si el correo está registrado, recibirás un código de verificación.",
        timer: 2000,
        showConfirmButton: false,
      });

      setPaso(2);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el código. Inténtalo de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: Validar código y actualizar contraseña
  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError("");

    // Misma política que el registro: entre 8 y 72 bytes.
    if (
      nuevaContrasena.length < 8 ||
      new TextEncoder().encode(nuevaContrasena).length > 72
    ) {
      setError("La contraseña debe tener entre 8 y 72 bytes.");
      return;
    }
    if (!/^\d{6}$/.test(codigo.trim())) {
      setError("El código debe tener exactamente 6 dígitos.");
      return;
    }

    setCargando(true);
    try {
      await llamarApi({
        accion: "restablecer",
        correo: correo.trim(),
        codigo: codigo.trim(),
        nuevaContrasena,
      });

      void Swal.fire({
        icon: "success",
        title: "¡Contraseña actualizada!",
        text: "Ya puedes iniciar sesión con tus nuevas credenciales.",
        timer: 2000,
        showConfirmButton: false,
      }).then(() => {
        router.push("/");
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "El código es inválido o ha vencido.",
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="container min-vh-100 d-flex justify-content-center align-items-center">
      <div className="card shadow p-4 color-card" style={{ maxWidth: "450px", width: "100%" }}>
        <h3 className="text-center mb-3 fw-bold">Recuperar Contraseña</h3>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {paso === 1 ? (
          <form onSubmit={handleSolicitarCodigo}>
            <p className="text-muted small mb-3">
              Ingresa tu correo institucional registrado para recibir un código de verificación válido por 10 minutos.
            </p>
            <div className="mb-3">
              <label className="form-label">Correo institucional</label>
              <input
                type="email"
                className="form-control"
                placeholder="usuario@unicesar.edu.co"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={cargando}>
              {cargando ? "Enviando..." : "Enviar código de recuperación"}
            </button>
            <div className="text-center">
              <Link href="/" className="small text-muted text-decoration-none">
                ← Volver al inicio de sesión
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRestablecer}>
            <p className="text-muted small mb-3">
              Si <strong>{correo}</strong> está registrado, enviamos un código de verificación.
            </p>
            <div className="mb-3">
              <label className="form-label">Código de verificación</label>
              <input
                type="text"
                className="form-control"
                placeholder="Código de 6 dígitos"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Nueva contraseña</label>
              <input
                type="password"
                className="form-control"
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                value={nuevaContrasena}
                onChange={(e) => setNuevaContrasena(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-success w-100 mb-3" disabled={cargando}>
              {cargando ? "Guardando..." : "Restablecer contraseña"}
            </button>
            <div className="text-center">
              <button
                type="button"
                className="btn btn-link btn-sm text-muted text-decoration-none p-0"
                onClick={() => setPaso(1)}
              >
                ← Cambiar correo o reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
