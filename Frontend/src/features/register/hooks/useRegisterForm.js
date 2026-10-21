// Gestiona los campos, navegación por teclado y envío del registro.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { validarFormularioRegistro } from "../validations/usuarios";

/**
 * Muestra un mensaje de error mediante la alerta estándar del formulario.
 * @param {string} mensaje Texto que se presenta al usuario.
 * @returns {void}
 */
function mostrarError(mensaje) {
  void Swal.fire({ icon: "error", text: mensaje });
}

/**
 * Gestiona los datos y el envío del formulario de registro.
 * @returns Campos, referencias y controladores de interacción del formulario.
 */
export function useRegisterForm() {
  const router = useRouter();
  const refs = useRef({});
  const temporizadorRegistro = useRef(null);
  // Información personal ingresada en el formulario.
  const [datosUsuario, setDatosUsuario] = useState({
    idUsuario: "",
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    edad: "",
    correo: "",
    contrasena: "",
  });
  // Ocupación seleccionada y valor libre para la opción "otro".
  const [tipoOcupacion, setTipoOcupacion] = useState("");
  const [ocupacionOtro, setOcupacionOtro] = useState("");
  // Confirmación de contraseña y estado de envío.
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);

  /**
   * Crea un callback ref administrado por este hook.
   * @param {string} campo Nombre del campo asociado.
   * @returns {(elemento: HTMLElement|null) => void} Callback ref para el control.
   */
  function asignarRef(campo) {
    return (elemento) => {
      refs.current[campo] = elemento;
    };
  }

  /**
   * Enfoca el control asociado al nombre recibido.
   * @param {string} campo Nombre del campo que recibirá el foco.
   * @returns {void}
   */
  function enfocarCampo(campo) {
    refs.current[campo]?.focus();
  }

  useEffect(
    () => () => window.clearTimeout(temporizadorRegistro.current),
    [],
  );

  /**
   * Actualiza el campo nombrado por el control del formulario.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} evento Evento de cambio.
   * @returns {void}
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setDatosUsuario((prev) => ({ ...prev, [name]: value }));
  }

  /**
   * Mueve el foco entre los campos según las teclas de navegación.
   * @param {React.KeyboardEvent<HTMLInputElement|HTMLSelectElement>} evento Evento de teclado.
   * @param {string} campoActual Nombre del campo enfocado.
   * @returns {void}
   */
  function manejarTeclado(evento, campoActual) {
    if (!["Enter", "ArrowDown", "ArrowUp"].includes(evento.key)) return;
    evento.preventDefault();

    const campos = [
      "primerNombre",
      "segundoNombre",
      "primerApellido",
      "segundoApellido",
      "idUsuario",
      "edad",
      "tipoOcupacion",
      ...(tipoOcupacion === "otro" ? ["ocupacionOtro"] : []),
      "correo",
      "contrasena",
      "confirmar-contrasena",
    ];
    const indice = campos.indexOf(campoActual);
    const desplazamiento = evento.key === "ArrowUp" ? -1 : 1;
    const idDestino = campos[indice + desplazamiento];

    if (idDestino) {
      enfocarCampo(idDestino);
    } else if (evento.key === "Enter") {
      void manejarSiguiente();
    }
  }

  /**
   * Valida y envía los datos de registro, mostrando el resultado al usuario.
   * @returns {Promise<void>}
   */
  async function manejarSiguiente() {
    if (guardando) return;

    const validacion = validarFormularioRegistro(
      {
        ...datosUsuario,
        ocupacion: tipoOcupacion === "otro" ? ocupacionOtro.trim() : tipoOcupacion,
      },
      confirmarContrasena,
    );
    if (!validacion.valido) {
      mostrarError(validacion.error);
      return;
    }

    setGuardando(true);
    void Swal.fire({
      title: "Registrando usuario",
      text: "Estamos guardando tu información. Esto tomará unos segundos.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
    const inicioRegistro = Date.now();
    try {
      const respuesta = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacion.datos),
      });
      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        mostrarError(resultado.error || "No se pudo crear la cuenta.");
        return;
      }

      const tiempoRestante = Math.max(0, 2000 - (Date.now() - inicioRegistro));
      if (tiempoRestante > 0) {
        await new Promise((resolve) => {
          temporizadorRegistro.current = window.setTimeout(resolve, tiempoRestante);
        });
      }
      void Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        text: "Tu cuenta se creó correctamente.",
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(({ isConfirmed }) => {
        if (isConfirmed) router.push("/");
      });
    } catch {
      mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return {
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
    manejarSiguiente,
  };
}
