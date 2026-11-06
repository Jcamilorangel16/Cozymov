// Gestiona los campos, navegación por teclado y envío del registro.
"use client";

import { useRef, useState } from "react";
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
  const [verificandoCorreo, setVerificandoCorreo] = useState(false);
  const [correoVerificado, setCorreoVerificado] = useState(false);

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

  /**
   * Actualiza el campo nombrado por el control del formulario.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} evento Evento de cambio.
   * @returns {void}
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target;
    setDatosUsuario((prev) => ({ ...prev, [name]: value }));
    if (name === "correo") setCorreoVerificado(false);
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

  async function manejarVerificarCorreo() {
    if (guardando || verificandoCorreo) return;

    const correo = datosUsuario.correo.trim();
    if (!/^[^\s@]+@[^\s@]+\.edu\.co$/i.test(correo)) {
      mostrarError("Ingresa un correo institucional válido terminado en .edu.co.");
      return;
    }

    setVerificandoCorreo(true);
    try {
      const respuestaEnvio = await fetch("/api/registro/enviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const resultadoEnvio = await respuestaEnvio.json();

      if (!respuestaEnvio.ok) {
        mostrarError(resultadoEnvio.error || "No se pudo enviar el código.");
        return;
      }

      const resultadoCodigo = await Swal.fire({
        title: "Verifica tu correo",
        text: `Enviamos un código de 6 dígitos a ${correo}.`,
        input: "text",
        inputLabel: "Código de verificación",
        inputPlaceholder: "123456",
        inputAttributes: {
          inputmode: "numeric",
          autocomplete: "one-time-code",
          maxlength: "6",
          "aria-label": "Código de verificación de 6 dígitos",
        },
        showCancelButton: true,
        confirmButtonText: "Verificar correo",
        cancelButtonText: "Cancelar",
        allowOutsideClick: false,
        inputValidator: (codigo) => {
          if (!/^\d{6}$/.test(codigo?.trim() ?? "")) {
            return "Ingresa los 6 dígitos del código.";
          }
        },
        preConfirm: async (codigo) => {
          try {
            const respuestaConfirmacion = await fetch("/api/registro/confirmar-codigo", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ correo, codigo: codigo.trim() }),
            });
            const resultadoConfirmacion = await respuestaConfirmacion.json();

            if (!respuestaConfirmacion.ok) {
              Swal.showValidationMessage(
                resultadoConfirmacion.error || "No se pudo verificar el correo.",
              );
              return false;
            }
            return true;
          } catch {
            Swal.showValidationMessage("No se pudo conectar con el servidor.");
            return false;
          }
        },
      });

      if (resultadoCodigo.isConfirmed) {
        setCorreoVerificado(true);
        await Swal.fire({
          icon: "success",
          title: "Correo verificado",
          text: "Ahora puedes completar tu registro.",
          confirmButtonText: "Continuar",
        });
      }
    } catch {
      mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setVerificandoCorreo(false);
    }
  }

  /**
   * Crea la cuenta solo después de verificar el correo.
   * @returns {Promise<void>}
   */
  async function manejarSiguiente() {
    if (guardando) return;

    if (!correoVerificado) {
      mostrarError("Correo no verificado. Verifica tu correo antes de crear la cuenta.");
      return;
    }

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
      title: "Creando cuenta",
      text: "Estamos guardando tu información.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const respuestaRegistro = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacion.datos),
      });
      const resultadoRegistro = await respuestaRegistro.json();

      if (!respuestaRegistro.ok) {
        if (respuestaRegistro.status === 400) setCorreoVerificado(false);
        mostrarError(resultadoRegistro.error || "No se pudo crear la cuenta.");
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        text: "Tu cuenta fue creada con el correo verificado.",
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
      router.push("/");
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
    verificandoCorreo,
    correoVerificado,
    manejarCambio,
    manejarTeclado,
    manejarVerificarCorreo,
    manejarSiguiente,
  };
}
