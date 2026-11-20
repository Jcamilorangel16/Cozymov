// Decide cuándo llevar al usuario a «En curso» porque tiene un viaje activo.

/**
 * Identifica el viaje activo que devuelve /api/viajes/en-curso.
 * @param {unknown} respuesta Cuerpo `{ viaje, rol }` de la ruta.
 * @returns `rol:idViaje`, o null si no hay viaje activo.
 */
export function claveViajeActivo(respuesta) {
  const viaje = respuesta?.viaje;
  if (!viaje || typeof viaje !== "object") return null;
  const id = viaje.id_viaje;
  if (id === undefined || id === null || id === "") return null;
  const rol = respuesta.rol === "conductor" ? "conductor" : "pasajero";
  return `${rol}:${id}`;
}

/**
 * Decide si hay que ir a «En curso» y si avisar de que el viaje es nuevo.
 * - Con un viaje que el usuario aún no había visto (lo aceptaron mientras
 *   estaba en otra sección o con la app cerrada): redirige y avisa.
 * - En la primera consulta al abrir la app con un viaje ya conocido: redirige
 *   sin avisar, para que el viaje activo sea lo primero que vea.
 * - Si ya está en «En curso» no hace nada: por ejemplo, acaba de aceptar él.
 * @param {{clave: string|null, claveVista: string|null, esPrimeraConsulta: boolean, vistaActiva: string}} estado
 * @returns {{redirigir: boolean, avisar: boolean}}
 */
export function decidirRedireccion({ clave, claveVista, esPrimeraConsulta, vistaActiva }) {
  if (!clave || vistaActiva === "en-curso") return { redirigir: false, avisar: false };
  const esNuevo = clave !== claveVista;
  return { redirigir: esNuevo || esPrimeraConsulta, avisar: esNuevo };
}

/**
 * Textos del aviso cuando aceptan el viaje del usuario.
 * @param {{viaje: object, rol: string}} respuesta Cuerpo de /api/viajes/en-curso.
 * @returns {{titulo: string, texto: string}}
 */
export function textoViajeAceptado(respuesta) {
  const { viaje = {}, rol } = respuesta ?? {};
  const ruta = viaje.origen && viaje.destino ? ` (${viaje.origen} → ${viaje.destino})` : "";
  if (rol === "conductor") {
    const pasajero = viaje.nombre_pasajero && viaje.nombre_pasajero !== "No disponible"
      ? viaje.nombre_pasajero
      : "Un pasajero";
    return {
      titulo: "¡Tienes un pasajero!",
      texto: `${pasajero} se unió a tu viaje${ruta}. Te llevamos a «En curso».`,
    };
  }
  return {
    titulo: "¡Aceptaron tu viaje!",
    texto: `Un conductor aceptó tu viaje${ruta}. Te llevamos a «En curso».`,
  };
}
