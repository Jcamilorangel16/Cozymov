// Gestiona los campos, la verificación del correo y el envío del registro.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  validarCodigoVerificacion,
  validarCorreoInstitucional,
  validarFormularioRegistro,
} from "../validations/usuarios";

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

  // Estado de la confirmación del correo institucional.
  const [correoVerificado, setCorreoVerificado] = useState(false);
  const [correoVerificadoValor, setCorreoVerificadoValor] = useState("");
  const [tokenVerificacion, setTokenVerificacion] = useState("");
  const [codigoSolicitadoPara, setCodigoSolicitadoPara] = useState("");
  const [modalVerificacionAbierto, setModalVerificacionAbierto] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState("");
  const [mensajeVerificacion, setMensajeVerificacion] = useState("");
  const [segundosReenvio, setSegundosReenvio] = useState(0);

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

  // Descuenta los segundos que faltan para poder pedir otro código.
  const cuentaRegresivaActiva = segundosReenvio > 0;
  useEffect(() => {
    if (!cuentaRegresivaActiva) return undefined;

    const intervalo = window.setInterval(() => {
      setSegundosReenvio((segundos) => (segundos > 1 ? segundos - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [cuentaRegresivaActiva]);

  /**
   * Descarta la confirmación guardada cuando el correo cambia.
   * @returns {void}
   */
  function reiniciarVerificacion() {
    setCorreoVerificado(false);
    setCorreoVerificadoValor("");
    setTokenVerificacion("");
    setCodigoSolicitadoPara("");
    setCodigoVerificacion("");
    setErrorVerificacion("");
    setMensajeVerificacion("");
    setSegundosReenvio(0);
  }

  /**
   * Actualiza el campo nombrado por el control del formulario.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement>} evento Evento de cambio.
   * @returns {void}
   */
  function manejarCambio(evento) {
    const { name, value } = evento.target;

    if (name === "correo") {
      const correoNormalizado = value.trim().toLowerCase();
      const correoConfirmado = correoVerificadoValor || codigoSolicitadoPara;
      if (correoConfirmado && correoNormalizado !== correoConfirmado) {
        reiniciarVerificacion();
      }
    }

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
   * Pide al backend que envíe un código de 6 dígitos al correo institucional.
   * @returns {Promise<void>}
   */
  async function solicitarCodigo() {
    if (enviandoCodigo) return;

    const validacion = validarCorreoInstitucional(datosUsuario.correo);
    if (!validacion.valido) {
      setErrorVerificacion(validacion.error);
      setModalVerificacionAbierto(true);
      return;
    }

    const correo = validacion.datos;
    setEnviandoCodigo(true);
    setErrorVerificacion("");
    setMensajeVerificacion(`Enviando un código de 6 dígitos a ${correo}...`);
    setModalVerificacionAbierto(true);

    try {
      const respuesta = await fetch("/api/registro/solicitar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setMensajeVerificacion(`No se pudo enviar el código a ${correo}.`);
        setErrorVerificacion(
          resultado.error || "No se pudo enviar el código de verificación.",
        );
        if (typeof resultado.reintentarEnSegundos === "number") {
          setSegundosReenvio(Math.max(0, resultado.reintentarEnSegundos));
        }
        return;
      }

      // Cada código nuevo invalida cualquier confirmación anterior.
      setCorreoVerificado(false);
      setCorreoVerificadoValor("");
      setTokenVerificacion("");
      setCodigoVerificacion("");
      setCodigoSolicitadoPara(correo);
      setMensajeVerificacion(
        resultado.mensaje || `Enviamos un código de 6 dígitos a ${correo}.`,
      );
      setSegundosReenvio(
        typeof resultado.reenviarEnSegundos === "number"
          ? resultado.reenviarEnSegundos
          : 60,
      );
    } catch {
      setMensajeVerificacion(`No se pudo enviar el código a ${correo}.`);
      setErrorVerificacion(
        "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      );
    } finally {
      setEnviandoCodigo(false);
    }
  }

  /**
   * Abre la ventana de verificación y solicita un código si aún no se envió.
   * @returns {void}
   */
  function abrirModalVerificacion() {
    setModalVerificacionAbierto(true);

    const correoNormalizado = datosUsuario.correo.trim().toLowerCase();
    if (!correoNormalizado || codigoSolicitadoPara === correoNormalizado) return;

    void solicitarCodigo();
  }

  /**
   * Envía el código ingresado y guarda el token de confirmación.
   * @returns {Promise<void>}
   */
  async function verificarCodigo() {
    if (verificandoCodigo) return;

    const validacionCorreo = validarCorreoInstitucional(datosUsuario.correo);
    if (!validacionCorreo.valido) {
      setErrorVerificacion(validacionCorreo.error);
      return;
    }

    const validacionCodigo = validarCodigoVerificacion(codigoVerificacion);
    if (!validacionCodigo.valido) {
      setErrorVerificacion(validacionCodigo.error);
      return;
    }

    setVerificandoCodigo(true);
    setErrorVerificacion("");

    try {
      const respuesta = await fetch("/api/registro/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: validacionCorreo.datos,
          codigo: validacionCodigo.datos,
        }),
      });
      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        setErrorVerificacion(
          resultado.error || "El código no es válido. Inténtalo de nuevo.",
        );
        return;
      }

      if (typeof resultado.token !== "string" || !resultado.token) {
        setErrorVerificacion(
          "El servidor no devolvió una confirmación válida. Inténtalo de nuevo.",
        );
        return;
      }

      setTokenVerificacion(resultado.token);
      setCorreoVerificado(true);
      setCorreoVerificadoValor(validacionCorreo.datos);
      setMensajeVerificacion("");
      setErrorVerificacion("");
      setCodigoVerificacion("");
      setModalVerificacionAbierto(false);

      void Swal.fire({
        icon: "success",
        title: "Correo confirmado",
        text: "Tu correo institucional quedó verificado.",
        confirmButtonText: "Continuar",
      });
    } catch {
      setErrorVerificacion(
        "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      );
    } finally {
      setVerificandoCodigo(false);
    }
  }

  /**
   * Reenvía un código nuevo al mismo correo.
   * @returns {void}
   */
  function reenviarCodigo() {
    if (segundosReenvio > 0 || enviandoCodigo) return;
    void solicitarCodigo();
  }

  /**
   * Cierra la ventana de verificación sin borrar la confirmación ya lograda.
   * @returns {void}
   */
  function cerrarModalVerificacion() {
    setModalVerificacionAbierto(false);
    setErrorVerificacion("");
    setCodigoVerificacion("");
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

    const correoNormalizado = validacion.datos.correo;
    const correoConfirmado =
      correoVerificado &&
      correoVerificadoValor === correoNormalizado &&
      Boolean(tokenVerificacion);

    if (!correoConfirmado) {
      abrirModalVerificacion();
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
        body: JSON.stringify({ ...validacion.datos, tokenVerificacion }),
      });
      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        mostrarError(resultado.error || "No se pudo crear la cuenta.");
        if (respuesta.status === 400 || respuesta.status === 409) {
          reiniciarVerificacion();
        }
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
    correoVerificado,
    correoVerificadoValor,
    modalVerificacionAbierto,
    codigoVerificacion,
    setCodigoVerificacion,
    enviandoCodigo,
    verificandoCodigo,
    errorVerificacion,
    mensajeVerificacion,
    segundosReenvio,
    solicitarCodigo,
    verificarCodigo,
    reenviarCodigo,
    cerrarModalVerificacion,
  };
}
