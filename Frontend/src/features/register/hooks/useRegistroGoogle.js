// Gestiona el formulario para completar el registro con Google.
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { validarFormularioRegistroGoogle } from "../validations/usuarios";

const CAMPOS_PERSONALES = [
  "primerNombre",
  "segundoNombre",
  "primerApellido",
  "segundoApellido",
  "idUsuario",
  "edad",
  "tipoOcupacion",
];
const CAMPOS_CONTRASENA = ["contrasena", "confirmar-contrasena"];

function mostrarError(mensaje) {
  return Swal.fire({ icon: "error", text: mensaje });
}

/**
 * Estado y acciones del formulario de registro con Google o Microsoft.
 * @param {{primerNombre: string, segundoNombre: string, primerApellido: string, segundoApellido: string}} nombres
 *   Nombres que dio el proveedor, para precargar los campos.
 * @param {string} [nombreProveedor] Nombre visible del proveedor.
 * @returns Valores y controladores del formulario.
 */
export function useRegistroGoogle(nombres, nombreProveedor = "Google") {
  const router = useRouter();
  const refs = useRef({});
  const [datosUsuario, setDatosUsuario] = useState({
    ...nombres,
    idUsuario: "",
    edad: "",
    telefono: "",
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
      ...CAMPOS_PERSONALES,
      ...(tipoOcupacion === "otro" ? ["ocupacionOtro"] : []),
      "telefono",
      ...CAMPOS_CONTRASENA,
    ];
    const indice = campos.indexOf(campoActual);
    const idDestino = campos[indice + (evento.key === "ArrowUp" ? -1 : 1)];

    if (idDestino) {
      enfocarCampo(idDestino);
    } else if (evento.key === "Enter") {
      void crearCuenta();
    }
  }

  async function crearCuenta() {
    if (guardando) return;

    const validacion = validarFormularioRegistroGoogle(
      {
        ...datosUsuario,
        ocupacion: tipoOcupacion === "otro" ? ocupacionOtro.trim() : tipoOcupacion,
      },
      confirmarContrasena,
    );
    if (!validacion.valido) {
      void mostrarError(validacion.error);
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await fetch("/api/registro/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validacion.datos),
      });
      const resultado = await respuesta.json().catch(() => ({}));

      if (!respuesta.ok) {
        await mostrarError(resultado.error || "No se pudo crear la cuenta.");
        if (resultado.vencido) router.replace("/register");
        return;
      }

      await Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        text: `Tu cuenta se creó. Puedes entrar con ${nombreProveedor} o con tu correo y contraseña.`,
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
      // La sesión ya está en la cookie; esta página copia el id al sessionStorage.
      router.replace("/auth/google");
    } catch {
      void mostrarError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
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
    crearCuenta,
  };
}
