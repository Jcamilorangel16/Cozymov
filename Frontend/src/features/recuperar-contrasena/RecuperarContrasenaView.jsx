"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

export default function RecuperarContrasenaView() {
  const router = useRouter();
  const [paso, setPaso] = useState(1); // 1: Solicitar correo, 2: Ingresar código y nueva contraseña
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // Paso 1: Enviar solicitud de código al correo institucional
  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setError("");

    if (!correo.endsWith(".edu.co")) {
      setError("Debe ingresar un correo institucional válido (.edu.co).");
      return;
    }

    setCargando(true);
    try {
      // TODO: Conectar con tu endpoint de API (ej: /api/auth/recuperar)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      void Swal.fire({
        icon: "success",
        title: "¡Código enviado!",
        text: "Revisa tu correo institucional para obtener el código de verificación.",
        timer: 1500,
        showConfirmButton: false,
      });
      
      setPaso(2);
    } catch (err) {
      console.error("No se pudo enviar el código. Inténtalo de nuevo.", err);
    } finally {
      setCargando(false);
    }
  };

  // Paso 2: Validar código y actualizar contraseña según RF-AUT-003
  const handleRestablecer = async (e) => {
    e.preventDefault();
    setError("");

    // Validación de contraseña segura (mínimo 8 caracteres, mayúscula, minúscula, número y símbolo)
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!regexPassword.test(nuevaContrasena)) {
      setError("La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial.");
      return;
    }

    setCargando(true);
    try {
      // TODO: Conectar con tu endpoint de API para actualizar la contraseña
      await new Promise((resolve) => setTimeout(resolve, 1000));

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
      console.error("Error al restablecer la contraseña.", err);
      setError("El código es inválido o ha expirado.");
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
              Ingresa tu correo institucional registrado para recibir un código de verificación de 5 minutos.
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
              Hemos enviado un código de verificación a <strong>{correo}</strong>.
            </p>
            <div className="mb-3">
              <label className="form-label">Código de verificación</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ingrese el código"
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
                placeholder="Mínimo 8 caracteres, símbolos, etc."
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