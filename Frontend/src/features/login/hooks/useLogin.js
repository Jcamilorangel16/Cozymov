// Gestiona credenciales, estados de respuesta y navegación del inicio de sesión.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

/**
 * Controla el envío de credenciales y el resultado del inicio de sesión.
 * @returns Campos de acceso, estado y acción de envío.
 */
export function useLogin() {
  const router = useRouter();
  // Credenciales y estado de la solicitud actual.
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [cargando, setCargando] = useState(false);
  // Mensaje mostrado cuando el acceso falla.
  const [errorLogin, setErrorLogin] = useState("");

  /**
   * Envía las credenciales y redirige al menú cuando el inicio es exitoso.
   * @param {React.FormEvent<HTMLFormElement>} event Evento de envío.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault();
    if (cargando) return;

    setCargando(true);
    setErrorLogin("");
    const inicioSolicitud = Date.now();
    try {
      const respuesta = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, contrasena }),
      });
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setErrorLogin(
          respuesta.status === 401
            ? "El correo o la contraseña son incorrectos. Verifica los datos e inténtalo de nuevo."
            : resultado.error || "No se pudo iniciar sesión. Inténtalo de nuevo.",
        );
        return;
      }

      window.sessionStorage.setItem("cozymov-usuario-id", resultado.usuario.id);
      void Swal.fire({
        title: "Iniciando sesión",
        text: "Estamos validando tus datos.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
      const tiempoRestante = Math.max(0, 1000 - (Date.now() - inicioSolicitud));
      if (tiempoRestante > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, tiempoRestante));
      }
      void Swal.fire({
        icon: "success",
        title: "¡Inicio de sesión exitoso!",
        text: "Has iniciado sesión correctamente.",
        timer: 500,
        timerProgressBar: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(({ dismiss }) => {
        if (dismiss === Swal.DismissReason.timer) router.push("/menu");
      });
    } catch {
      setErrorLogin("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return {
    correo,
    setCorreo,
    contrasena,
    setContrasena,
    cargando,
    errorLogin,
    setErrorLogin,
    handleSubmit,
  };
}
