// Gestiona los datos, el paso de verificación y el envío del registro.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  validarCodigoVerificacion,
  validarCorreoInstitucional,
  validarFormularioRegistro,
} from "../validations/usuarios";

function mostrarError(mensaje) {
  void Swal.fire({ icon: "error", text: mensaje });
}

export function useRegisterForm() {
  const router = useRouter();
  const refs = useRef({});
  const temporizadorRegistro = useRef(null);
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
  const [tipoOcupacion, setTipoOcupacion] = useState("");
  const [ocupacionOtro, setOcupacionOtro] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [pasoCorreo, setPasoCorreo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comprobante, setComprobante] = useState("");
  const [codigoSolicitadoPara, setCodigoSolicitadoPara] = useState("");
  const [codigoVerificacion, setCodigoVerificacion] = useState("");
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  const [verificandoCodigo, setVerificandoCodigo] = useState(false);
  const [errorVerificacion, setErrorVerificacion] = useState("");
  const [mensajeVerificacion, setMensajeVerificacion] = useState("");

  function asignarRef(campo) {
    return (elemento) => {
      refs.current[campo] = elemento;
    };
  }

  function enfocarCampo(campo) {
    refs.current[campo]?.focus();
  }

  useEffect(
    () => () => window.clearTimeout(temporizadorRegistro.current),
    [],
  );

  function reiniciarVerificacion() {
    setComprobante("");
    setCodigoSolicitadoPara("");
    setCodigoVerificacion("");
    setErrorVerificacion("");
    setMensajeVerificacion("");
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    const valor = name === "idUsuario"
      ? value.replace(/\D/g, "")
      : value;
    if (
      name === "correo" &&
      codigoSolicitadoPara &&
      value.trim().toLowerCase() !== codigoSolicitadoPara
    ) {
      reiniciarVerificacion();
      setPasoCorreo(false);
    }

    setDatosUsuario((prev) => ({ ...prev, [name]: valor }));
  }

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

  function obtenerDatosValidados() {
    return validarFormularioRegistro(
      {
        ...datosUsuario,
        ocupacion: tipoOcupacion === "otro" ? ocupacionOtro.trim() : tipoOcupacion,
      },
      confirmarContrasena,
    );
  }

  async function solicitarCodigo() {
    if (enviandoCodigo) return;

    const validacion = validarCorreoInstitucional(datosUsuario.correo);
    if (!validacion.valido) {
      setErrorVerificacion(validacion.error);
      return;
    }

    setEnviandoCodigo(true);
    setErrorVerificacion("");
    setMensajeVerificacion("Enviando el código...");

    try {
      const respuesta = await fetch("/api/registro/codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: validacion.datos }),
      });
      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        const mensaje =
          resultado.error || "No se pudo enviar el código de verificación.";
        setErrorVerificacion(
          mensaje,
        );
        setMensajeVerificacion("");
        if (respuesta.status === 409) {
          setComprobante("");
          setCodigoSolicitadoPara("");
          setCodigoVerificacion("");
        }
        if (!pasoCorreo) mostrarError(mensaje);
        return;
      }

      if (typeof resultado.comprobante !== "string" || !resultado.comprobante) {
        setErrorVerificacion("El servidor no devolvió un comprobante válido.");
        setMensajeVerificacion("");
        return;
      }

      setComprobante(resultado.comprobante);
      setCodigoSolicitadoPara(validacion.datos);
      setCodigoVerificacion("");
      setMensajeVerificacion("El código vence en 10 minutos.");
      setPasoCorreo(true);
    } catch {
      setErrorVerificacion(
        "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      );
      setMensajeVerificacion("");
    } finally {
      setEnviandoCodigo(false);
    }
  }

  async function manejarSiguiente() {
    if (guardando || enviandoCodigo) return;

    const validacion = obtenerDatosValidados();
    if (!validacion.valido) {
      mostrarError(validacion.error);
      return;
    }

    const correo = validacion.datos.correo;
    if (comprobante && codigoSolicitadoPara === correo) {
      setPasoCorreo(true);
      setErrorVerificacion("");
      return;
    }

    await solicitarCodigo();
  }

  async function verificarCodigo() {
    if (verificandoCodigo || guardando) return;

    const validacionDatos = obtenerDatosValidados();
    if (!validacionDatos.valido) {
      mostrarError(validacionDatos.error);
      setPasoCorreo(false);
      return;
    }

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

    if (
      !comprobante ||
      codigoSolicitadoPara !== validacionCorreo.datos
    ) {
      setErrorVerificacion("Solicita un código para este correo antes de continuar.");
      return;
    }

    setVerificandoCodigo(true);
    setGuardando(true);
    setErrorVerificacion("");

    let mostrandoCargaRegistro = false;

    try {
      const respuestaVerificacion = await fetch("/api/registro/codigo/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: validacionCorreo.datos,
          comprobante,
          codigo: validacionCodigo.datos,
        }),
      });
      const resultadoVerificacion = await respuestaVerificacion.json().catch(() => ({}));

      if (!respuestaVerificacion.ok) {
        setErrorVerificacion(
          resultadoVerificacion.error || "El código no es válido. Inténtalo de nuevo.",
        );
        return;
      }

      mostrandoCargaRegistro = true;
      void Swal.fire({
        title: "Creando tu cuenta",
        text: "Estamos guardando tu información.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
      const inicioRegistro = Date.now();
      const respuestaRegistro = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validacionDatos.datos,
          verificacion: {
            comprobante,
            codigo: validacionCodigo.datos,
          },
        }),
      });
      const resultadoRegistro = await respuestaRegistro.json().catch(() => ({}));

      if (!respuestaRegistro.ok) {
        setErrorVerificacion(
          resultadoRegistro.error || "No se pudo crear la cuenta.",
        );
        return;
      }

      const tiempoRestante = Math.max(0, 2000 - (Date.now() - inicioRegistro));
      if (tiempoRestante > 0) {
        await new Promise((resolve) => {
          temporizadorRegistro.current = window.setTimeout(resolve, tiempoRestante);
        });
      }
      mostrandoCargaRegistro = false;
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
      setErrorVerificacion(
        "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      );
    } finally {
      if (mostrandoCargaRegistro) {
        Swal.close();
      }
      setVerificandoCodigo(false);
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
    pasoCorreo,
    volverADatos: () => setPasoCorreo(false),
    guardando,
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
  };
}
