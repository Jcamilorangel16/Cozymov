// Hook reutilizable para formularios con validación, guardado y restablecimiento.
"use client";

import { useState } from "react";

/**
 * Gestiona el estado de un bloque de formulario independiente.
 * @param {object} valoresIniciales Valores con los que inicia el formulario.
 * @param {(datos: object) => object} validar Devuelve los errores por campo.
 * @param {(datos: object) => (object|void|Promise<object|void>)} [onGuardar] Acción de guardado.
 * @returns {{datos: object, errores: object, mensaje: string, tipoMensaje: "ok"|"error", cambiar: Function, guardar: Function, restablecer: Function}}
 */
export function useFormulario(valoresIniciales, validar, onGuardar) {
  const [datos, setDatos] = useState(valoresIniciales);
  const [guardado, setGuardado] = useState(valoresIniciales);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState("ok");

  /**
   * Actualiza el campo modificado y limpia su error y el mensaje del bloque.
   * @param {React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>} evento Evento de cambio.
   * @returns {void}
   */
  const cambiar = (evento) => {
    const { name, value, type, checked } = evento.target;
    setDatos((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
    setMensaje("");
  };

  /**
   * Valida el formulario y ejecuta el guardado del bloque.
   * @param {React.FormEvent<HTMLFormElement>} [evento] Evento de envío.
   * @returns {Promise<boolean>} Si el guardado se completó.
   */
  const guardar = async (evento) => {
    evento?.preventDefault?.();
    const nuevosErrores = validar(datos);
    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      setTipoMensaje("error");
      setMensaje("Revisa los campos marcados.");
      return false;
    }

    try {
      const resultado = await onGuardar?.(datos);
      const tieneResultado =
        resultado && typeof resultado === "object" && "guardado" in resultado;
      const proximo = tieneResultado ? resultado.guardado : resultado ?? datos;

      setDatos(proximo);
      setGuardado(proximo);
      setTipoMensaje("ok");
      setMensaje(
        tieneResultado && resultado.mensaje
          ? resultado.mensaje
          : "Cambios guardados.",
      );
      return true;
    } catch (error) {
      setTipoMensaje("error");
      setMensaje(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los cambios.",
      );
      return false;
    }
  };

  /**
   * Vuelve al último estado guardado del bloque.
   * @returns {void}
   */
  const restablecer = () => {
    setDatos(guardado);
    setErrores({});
    setMensaje("");
  };

  return {
    datos,
    errores,
    mensaje,
    tipoMensaje,
    cambiar,
    guardar,
    restablecer,
  };
}
