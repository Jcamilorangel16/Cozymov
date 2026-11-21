// Gestiona los datos y el envío del registro.
"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  abrirVentanaCodigoRegistro,
  ESPERA_REENVIO_MS,
  solicitarCodigo,
} from "../../../lib/codigoCorreoCliente";
import {
  validarCorreoRegistro,
  validarFormularioRegistro,
} from "../validations/usuarios";

// El código vence a los 10 minutos en el servidor; pasado este margen se pide
// uno nuevo en vez de reabrir la ventana.
const VIGENCIA_CODIGO_MS = 9 * 60 * 1000;

// Borrador de lo escrito (sin contraseñas). Lo guardaba la antigua
// verificación con Google antes de salir de la página; se sigue leyendo por si
// quedó uno en la pestaña.
const CLAVE_BORRADOR = "cozymov:registro-borrador";
const CAMPOS_BORRADOR = [
  "idUsuario",
  "primerNombre",
  "segundoNombre",
  "primerApellido",
  "segundoApellido",
  "edad",
  "telefono",
  "correo",
];

function mostrarError(mensaje) {
  void Swal.fire({ icon: "error", text: mensaje });
}

// sessionStorage no emite eventos en la misma pestaña: no hay a qué suscribirse.
const suscribirBorrador = () => () => {};
const leerBorradorCrudo = () => {
  try {
    return window.sessionStorage.getItem(CLAVE_BORRADOR) ?? "";
  } catch {
    return "";
  }
};
const borradorEnServidor = () => "";

/**
 * Lee el borrador guardado antes de ir a Google. En el servidor y en la
 * hidratación es null; después vale lo guardado en esta pestaña.
 * @returns Campos guardados o null si no hay borrador.
 */
export function useBorradorRegistro() {
  const crudo = useSyncExternalStore(suscribirBorrador, leerBorradorCrudo, borradorEnServidor);
  return useMemo(() => {
    if (!crudo) return null;
    try {
      const borrador = JSON.parse(crudo);
      return borrador && typeof borrador === "object" ? borrador : null;
    } catch {
      return null;
    }
  }, [crudo]);
}

/**
 * Valor de texto del borrador o el valor por defecto.
 * @param {object|null} borrador Borrador leído.
 * @param {string} campo Nombre del campo.
 * @param {string} porDefecto Valor si el borrador no lo trae.
 * @returns Texto para el estado inicial.
 */
function textoBorrador(borrador, campo, porDefecto = "") {
  return typeof borrador?.[campo] === "string" ? borrador[campo] : porDefecto;
}

/**
 * Estado y acciones del formulario de registro con contraseña.
 * @param {{correoVerificado?: string, borrador?: object|null}} opciones Correo
 *   que Google ya confirmó (vacío si ninguno) y lo escrito antes de ir a Google.
 *   Ambos solo se usan como estado inicial.
 * @returns Valores y controladores del formulario.
 */
export function useRegisterForm({ correoVerificado: correoVerificadoInicial = "", borrador = null } = {}) {
  const router = useRouter();
  const refs = useRef({});
  const temporizadorRegistro = useRef(null);
  const [datosUsuario, setDatosUsuario] = useState(() => ({
    ...Object.fromEntries(CAMPOS_BORRADOR.map((campo) => [campo, textoBorrador(borrador, campo)])),
    correo: textoBorrador(borrador, "correo", correoVerificadoInicial),
    contrasena: "",
  }));
  const [tipoOcupacion, setTipoOcupacion] = useState(() => textoBorrador(borrador, "tipoOcupacion"));
  const [ocupacionOtro, setOcupacionOtro] = useState(() => textoBorrador(borrador, "ocupacionOtro"));
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [correoVerificado, setCorreoVerificado] = useState(correoVerificadoInicial);

  // Confirmación del correo con un código enviado por SMTP.
  const [enviandoCodigo, setEnviandoCodigo] = useState(false);
  // Último envío: a qué correo, cuándo y desde cuándo se puede reenviar.
  const ultimoEnvio = useRef({ correo: "", enviadoEn: 0, reenvioDesde: 0 });

  const correoNormalizado = datosUsuario.correo.replace(/\s+/g, "").toLowerCase();
  const correoEstaVerificado = correoVerificado !== "" && correoNormalizado === correoVerificado;

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

  function segundosParaReenviar(correo) {
    const envio = ultimoEnvio.current;
    if (envio.correo !== correo) return 0;
    return Math.max(0, Math.ceil((envio.reenvioDesde - Date.now()) / 1000));
  }

  /** Pide un código y anota el envío (o la espera que exige el servidor). */
  async function enviarCodigoA(correo) {
    const envio = await solicitarCodigo(correo, "registro");
    const ahora = Date.now();
    if (envio.ok) {
      ultimoEnvio.current = { correo, enviadoEn: ahora, reenvioDesde: ahora + ESPERA_REENVIO_MS };
    } else if (typeof envio.esperar === "number") {
      ultimoEnvio.current = { ...ultimoEnvio.current, correo, reenvioDesde: ahora + envio.esperar * 1000 };
    }
    return envio;
  }

  /**
   * Envía un código al correo del formulario y abre la ventana para
   * escribirlo. Si ya se envió uno a ese correo hace menos de 10 minutos, solo
   * reabre la ventana (desde ahí se puede reenviar).
   */
  async function confirmarCorreo() {
    if (guardando || enviandoCodigo) return;
    const correo = validarCorreoRegistro(datosUsuario.correo);
    if (!correo.valido) {
      mostrarError(correo.error);
      enfocarCampo("correo");
      return;
    }

    const envio = ultimoEnvio.current;
    const codigoVigente = envio.correo === correo.datos && envio.enviadoEn > Date.now() - VIGENCIA_CODIGO_MS;
    setEnviandoCodigo(true);
    try {
      if (!codigoVigente) {
        const resultado = await enviarCodigoA(correo.datos);
        if (!resultado.ok) {
          mostrarError(resultado.error);
          return;
        }
      }
      const verificado = await abrirVentanaCodigoRegistro({
        correo: correo.datos,
        segundosParaReenviar: () => segundosParaReenviar(correo.datos),
        reenviar: () => enviarCodigoA(correo.datos),
      });
      if (verificado) {
        setCorreoVerificado(correo.datos);
        ultimoEnvio.current = { correo: "", enviadoEn: 0, reenvioDesde: 0 };
        void Swal.fire({ icon: "success", text: "Correo confirmado.", timer: 1500, showConfirmButton: false });
      }
    } finally {
      setEnviandoCodigo(false);
    }
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target;
    const valor = name === "idUsuario"
      ? value.replace(/\D/g, "")
      : name === "telefono"
        ? value.replace(/[^0-9+\s\-.()]/g, "")
        : value;

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
      "telefono",
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

    if (!correoEstaVerificado) {
      mostrarError(
        "Antes de crear la cuenta, pulsa «Confirmar correo» y escribe el código que te llegue.",
      );
      enfocarCampo("confirmar-correo");
      return;
    }

    setGuardando(true);
    let mostrandoCargaRegistro = true;
    void Swal.fire({
      title: "Creando tu cuenta",
      text: "Estamos guardando tu información.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const inicioRegistro = Date.now();
      const respuestaRegistro = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacion.datos),
      });
      const resultadoRegistro = await respuestaRegistro.json().catch(() => ({}));

      if (!respuestaRegistro.ok) {
        mostrandoCargaRegistro = false;
        // La verificación venció o no coincide: hay que repetirla.
        if (resultadoRegistro.verificar) setCorreoVerificado("");
        mostrarError(resultadoRegistro.error || "No se pudo crear la cuenta.");
        return;
      }

      try {
        window.sessionStorage.removeItem(CLAVE_BORRADOR);
      } catch {
        // Sin sessionStorage no hay borrador que borrar.
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
      mostrandoCargaRegistro = false;
      mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      if (mostrandoCargaRegistro) {
        Swal.close();
      }
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
    correoEstaVerificado,
    enviandoCodigo,
    confirmarCorreo,
    manejarCambio,
    manejarTeclado,
    manejarSiguiente,
  };
}
