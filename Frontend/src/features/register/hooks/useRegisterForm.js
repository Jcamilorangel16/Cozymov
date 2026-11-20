// Gestiona los datos y el envío del registro.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { validarFormularioRegistro } from "../validations/usuarios";

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
  const [guardando, setGuardando] = useState(false);

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
        mostrarError(resultadoRegistro.error || "No se pudo crear la cuenta.");
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
    manejarCambio,
    manejarTeclado,
    manejarSiguiente,
  };
}
