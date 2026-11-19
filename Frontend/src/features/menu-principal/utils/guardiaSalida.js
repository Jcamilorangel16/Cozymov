// Evita que el botón «atrás» del navegador saque al usuario de la plataforma sin confirmar.
//
// Idea: se añade una entrada «centinela» al historial con la misma URL. La primera vez que el
// usuario va atrás, solo consume el centinela (se queda en el menú); se vuelve a colocar otro y
// se pregunta si de verdad quiere salir. Si va atrás una segunda vez con la pregunta abierta, o
// pulsa «Sí, salir», se sale de verdad.

/** Marca que distingue la entrada centinela dentro de `history.state`. */
export const MARCA_GUARDIA = "cozymovGuardiaSalida";

/**
 * Instala la protección contra la salida accidental con «atrás».
 * @param {Window} ventana Ventana del navegador (se inyecta para poder probar la lógica).
 * @param {{pedirConfirmacion: () => Promise<boolean>|boolean, cerrarConfirmacion: () => void, hayOtroAviso?: () => boolean}} acciones
 * `pedirConfirmacion` muestra la pregunta y devuelve true si el usuario quiere salir;
 * `cerrarConfirmacion` la cierra desde fuera; `hayOtroAviso` indica que ya hay otra ventana
 * emergente abierta, que no se debe pisar.
 * @returns {() => void} Función que quita la protección.
 */
export function instalarGuardiaSalida(
  ventana,
  { pedirConfirmacion, cerrarConfirmacion, hayOtroAviso = () => false },
) {
  const historia = ventana.history;
  let preguntando = false;
  let saliendo = false;

  const estaArmada = () => Boolean(historia.state?.[MARCA_GUARDIA]);

  function armar() {
    // Con React en modo estricto el efecto corre dos veces: no se apilan dos centinelas.
    if (estaArmada()) return;
    historia.pushState({ [MARCA_GUARDIA]: true }, "", ventana.location.href);
  }

  function alVolver() {
    if (saliendo) return;
    // Llegar al centinela hacia adelante no es un «atrás»: no hay nada que hacer.
    if (estaArmada()) return;

    // Segundo «atrás» con la pregunta abierta: el usuario confirma que quiere salir.
    if (preguntando) {
      saliendo = true;
      cerrarConfirmacion();
      historia.go(-1);
      return;
    }

    // Primer «atrás»: se repone el centinela para que el siguiente también quede atrapado.
    armar();
    // Si ya hay otra ventana abierta (p. ej. el aviso de llegada) no se pisa: solo se retiene.
    if (hayOtroAviso()) return;

    preguntando = true;
    void Promise.resolve(pedirConfirmacion()).then((salir) => {
      if (saliendo) return; // ya salió con el segundo «atrás»
      preguntando = false;
      if (salir) {
        saliendo = true;
        historia.go(-2); // el centinela repuesto y la entrada real del menú
      }
    });
  }

  // Chrome y otros navegadores ignoran al ir atrás las entradas añadidas sin que el usuario haya
  // interactuado con la página: si aún no hubo interacción, se espera a la primera.
  const hubo = ventana.navigator?.userActivation?.hasBeenActive ?? true;
  const eventosInteraccion = ["pointerdown", "keydown", "touchstart"];
  const alInteractuar = () => {
    armar();
    quitarInteraccion();
  };
  function quitarInteraccion() {
    for (const evento of eventosInteraccion) ventana.removeEventListener(evento, alInteractuar);
  }
  if (hubo) {
    armar();
  } else {
    for (const evento of eventosInteraccion) ventana.addEventListener(evento, alInteractuar);
  }

  ventana.addEventListener("popstate", alVolver);
  return () => {
    ventana.removeEventListener("popstate", alVolver);
    quitarInteraccion();
  };
}
