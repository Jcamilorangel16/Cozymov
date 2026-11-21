// Funciones de navegador para los códigos de 6 dígitos enviados por correo:
// pedir un código y la ventana emergente que lo confirma (con reenvío).
"use client";

import Swal from "sweetalert2";

const ERROR_CONEXION = "No se pudo conectar con el servidor. Inténtalo de nuevo.";
/** Espera mínima entre envíos; el backend la vuelve a exigir. */
export const ESPERA_REENVIO_MS = 60_000;

/**
 * Pide al servidor que envíe un código al correo.
 * @param {string} correo Correo normalizado.
 * @param {"registro"|"recuperacion"} proposito Para qué es el código.
 * @returns {Promise<{ok: true, mensaje: string} | {ok: false, error: string, esperar?: number}>}
 */
export async function solicitarCodigo(correo, proposito) {
  try {
    const respuesta = await fetch("/api/codigo-correo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, proposito }),
    });
    const resultado = await respuesta.json().catch(() => ({}));
    if (respuesta.ok) {
      return { ok: true, mensaje: resultado.mensaje || "Te enviamos un código de 6 dígitos." };
    }
    return {
      ok: false,
      error: resultado.error || "No se pudo enviar el código.",
      ...(typeof resultado.esperar === "number" ? { esperar: resultado.esperar } : {}),
    };
  } catch {
    return { ok: false, error: ERROR_CONEXION };
  }
}

function escaparHtml(texto) {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Ventana emergente para escribir el código del registro. Confirma contra
 * `/api/verificacion-correo` (que firma la cookie del correo verificado) y
 * permite reenviar el código sin cerrarse.
 * @param {object} opciones
 * @param {string} opciones.correo Correo al que se envió el código.
 * @param {() => number} opciones.segundosParaReenviar Segundos que faltan para poder reenviar.
 * @param {() => Promise<{ok: boolean, mensaje?: string, error?: string}>} opciones.reenviar Pide otro código.
 * @returns {Promise<boolean>} true si el correo quedó verificado.
 */
export async function abrirVentanaCodigoRegistro({ correo, segundosParaReenviar, reenviar }) {
  const correoHtml = `<strong>${escaparHtml(correo)}</strong>`;
  let intervalo;

  const actualizarBotonReenvio = () => {
    const boton = Swal.getDenyButton();
    if (!boton || Swal.isLoading()) return;
    const segundos = segundosParaReenviar();
    boton.disabled = segundos > 0;
    boton.textContent = segundos > 0 ? `Reenviar código (${segundos} s)` : "Reenviar código";
  };

  const resultado = await Swal.fire({
    title: "Confirma tu correo",
    html:
      `Escribe el código de 6 dígitos que enviamos a ${correoHtml}. ` +
      "Revisa también la carpeta de correo no deseado.",
    input: "text",
    inputPlaceholder: "123456",
    inputAttributes: {
      inputmode: "numeric",
      autocomplete: "one-time-code",
      maxlength: "6",
      "aria-label": "Código de verificación",
    },
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    denyButtonText: "Reenviar código",
    cancelButtonText: "Cancelar",
    denyButtonColor: "#6c757d",
    showLoaderOnConfirm: true,
    showLoaderOnDeny: true,
    allowOutsideClick: () => !Swal.isLoading(),
    didOpen: () => {
      actualizarBotonReenvio();
      intervalo = window.setInterval(actualizarBotonReenvio, 1000);
      const campo = Swal.getInput();
      campo?.addEventListener("input", () => {
        campo.value = campo.value.replace(/\D/g, "").slice(0, 6);
      });
    },
    willClose: () => window.clearInterval(intervalo),
    preConfirm: async (valor) => {
      const codigo = String(valor ?? "").replace(/\D/g, "");
      if (codigo.length !== 6) {
        Swal.showValidationMessage("El código tiene 6 dígitos.");
        return false;
      }
      try {
        const respuesta = await fetch("/api/verificacion-correo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, codigo }),
        });
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok) {
          Swal.showValidationMessage(datos.error || "No se pudo confirmar el código.");
          return false;
        }
        return true;
      } catch {
        Swal.showValidationMessage(ERROR_CONEXION);
        return false;
      }
    },
    preDeny: async () => {
      Swal.resetValidationMessage();
      if (segundosParaReenviar() > 0) return false;
      const envio = await reenviar();
      if (envio.ok) {
        const contenedor = Swal.getHtmlContainer();
        if (contenedor) {
          contenedor.innerHTML =
            `Te enviamos un código nuevo a ${correoHtml}. El anterior ya no sirve. ` +
            "Revisa también la carpeta de correo no deseado.";
        }
        const campo = Swal.getInput();
        if (campo) {
          campo.value = "";
          campo.focus();
        }
      } else {
        Swal.showValidationMessage(envio.error || "No se pudo reenviar el código.");
      }
      // false mantiene la ventana abierta.
      window.setTimeout(actualizarBotonReenvio, 0);
      return false;
    },
  });

  return resultado.isConfirmed === true;
}
