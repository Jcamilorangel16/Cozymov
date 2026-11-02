// Gestiona el texto y el estado de envío del formulario de mensajes.
"use client";

import { useState } from "react";
import { esMensajeListoParaEnviar } from "../validations/mensajes";

/**
 * Controla el envío de un mensaje y la limpieza del campo de texto.
 * @param {(texto: string) => Promise<void>} onEnviarMensaje Acción de envío del mensaje.
 * @returns Valor del campo, estado y manejador de envío.
 */
export function useFormularioMensaje(onEnviarMensaje) {
  // Texto actual y estado que bloquea envíos duplicados.
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  /**
   * Valida y procesa el envío del mensaje actual.
   * @param {React.FormEvent<HTMLFormElement>} evento Evento de envío.
   * @returns {Promise<void>}
   */
  async function handleSubmit(evento) {
    evento.preventDefault();
    if (!esMensajeListoParaEnviar(texto, enviando)) return;

    setEnviando(true);
    await onEnviarMensaje(texto);
    setTexto("");
    setEnviando(false);
  }

  return {
    texto,
    setTexto,
    enviando,
    handleSubmit,
    mensajeListo: esMensajeListoParaEnviar(texto, enviando),
  };
}
