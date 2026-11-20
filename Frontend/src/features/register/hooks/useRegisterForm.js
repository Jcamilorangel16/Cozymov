// Gestiona los datos y el envío del registro.
"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  validarCorreoRegistro,
  validarFormularioRegistro,
} from "../validations/usuarios";

// Lo escrito antes de ir a Google para verificar el correo. Nunca incluye las
// contraseñas, que hay que volver a escribir.
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

  /**
   * Guarda lo escrito (sin contraseñas) y va a Google para confirmar que el
   * correo del formulario es del usuario.
   */
  function verificarCorreo() {
    if (guardando) return;
    const correo = validarCorreoRegistro(datosUsuario.correo);
    if (!correo.valido) {
      mostrarError(correo.error);
      enfocarCampo("correo");
      return;
    }

    try {
      window.sessionStorage.setItem(
        CLAVE_BORRADOR,
        JSON.stringify({
          ...Object.fromEntries(CAMPOS_BORRADOR.map((campo) => [campo, datosUsuario[campo]])),
          tipoOcupacion,
          ocupacionOtro,
        }),
      );
    } catch {
      // Sin sessionStorage solo se pierde lo escrito; la verificación sigue.
    }
    // Navegación completa: es una ruta API que redirige a Google, no una página.
    const destino = new URL("/api/auth/google", window.location.origin);
    destino.searchParams.set("verificar", correo.datos);
    window.location.assign(destino.toString());
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
        "Antes de crear la cuenta, pulsa «Verificar con Google» y entra con la cuenta de Google de ese correo.",
      );
      refs.current["verificar-correo"]?.focus();
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
    verificarCorreo,
    manejarCambio,
    manejarTeclado,
    manejarSiguiente,
  };
}
