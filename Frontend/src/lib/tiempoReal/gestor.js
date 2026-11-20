// Una sola conexión de tiempo real (SignalR) por pestaña, compartida por todos los
// componentes que la usan. Se abre con el primero y se cierra poco después del último.
//
// La conexión solo avisa de cambios: los datos siguen viniendo de las APIs HTTP. Tras
// cada (re)conexión se emite «resincronizar» para que cada vista vuelva a consultar lo
// que pudo cambiar mientras no había conexión. Sin conexión, las vistas usan su consulta
// periódica de siempre.
import { NOMBRES_EVENTOS, normalizarEvento, retrasoReintento } from "./eventos.js";

export const ESTADOS = Object.freeze({
  INACTIVO: "inactivo",
  CONECTANDO: "conectando",
  CONECTADO: "conectado",
  RECONECTANDO: "reconectando",
  DESCONECTADO: "desconectado",
  /** Sin sesión o tiempo real desactivado: no se reintenta en esta página. */
  NO_DISPONIBLE: "no-disponible",
});

/** El servidor no dará ticket aunque se reintente (sin sesión o función desactivada). */
export class ErrorTicketPermanente extends Error {
  /**
   * @param {string} mensaje
   * @param {string|null} [motivo] Código que envía el servidor con el 503 (diagnóstico).
   */
  constructor(mensaje, motivo = null) {
    super(mensaje);
    this.motivo = motivo;
  }
}

/**
 * Pide al servidor de Next.js un ticket de un solo uso para el Hub. La sesión viaja en la
 * cookie httpOnly; el navegador nunca ve la clave interna del backend.
 * @param {typeof fetch} pedir Implementación de fetch.
 * @returns {Promise<{ticket: string, url: string}>}
 */
export async function pedirTicketAlServidor(pedir = fetch) {
  const respuesta = await pedir("/api/tiempo-real/ticket", {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
  });
  const datos = await respuesta.json().catch(() => null);
  if (respuesta.status === 401) {
    throw new ErrorTicketPermanente(datos?.error ?? "Debes iniciar sesión.");
  }
  if (respuesta.status === 503 && datos?.desactivado === true) {
    const motivo = typeof datos.motivo === "string" ? datos.motivo : null;
    // El 503 es esperado: la app sigue con consultas HTTP. El motivo ayuda a diagnosticarlo.
    console.info(
      `Tiempo real no disponible${motivo ? ` (motivo: ${motivo})` : ""}; se usan consultas periódicas.`,
    );
    throw new ErrorTicketPermanente(datos?.error ?? "Tiempo real no disponible.", motivo);
  }
  if (!respuesta.ok || typeof datos?.ticket !== "string" || typeof datos?.url !== "string") {
    throw new Error("No se pudo obtener el ticket de tiempo real.");
  }
  return { ticket: datos.ticket, url: datos.url };
}

function avisar(oyente, ...argumentos) {
  try {
    oyente(...argumentos);
  } catch (error) {
    // Un componente que falla no debe cortar la entrega a los demás.
    console.error("Error en un oyente de tiempo real:", error);
  }
}

/**
 * Crea un gestor de conexión. Las dependencias se pueden sustituir en pruebas.
 * @param {object} [dependencias]
 * @returns Gestor con `usar`, `on`, `alCambiarEstado`, `alResincronizar`, `estadoActual` y `reintentarAhora`.
 */
export function crearGestorTiempoReal({
  cargarSignalR = () => import("@microsoft/signalr"),
  pedirTicket = () => pedirTicketAlServidor(),
  programar = (accion, ms) => setTimeout(accion, ms),
  cancelarProgramado = (id) => clearTimeout(id),
  aleatorio = Math.random,
  esperaAntesDeCerrar = 1_000,
  entorno = typeof window === "undefined" ? null : window,
} = {}) {
  let estado = ESTADOS.INACTIVO;
  let usuarios = 0;
  let conexion = null;
  let iniciando = false;
  // Cambia al detener: invalida lo que un inicio anterior aún tuviera en curso.
  let generacion = 0;
  let reintentos = 0;
  let temporizadorReintento = null;
  let temporizadorCierre = null;
  // Ticket ya pedido para el primer intento de la conexión recién creada.
  let ticketReservado = null;
  let permanente = false;
  let escuchandoEntorno = false;

  const oyentesEvento = new Map(NOMBRES_EVENTOS.map((nombre) => [nombre, new Set()]));
  const oyentesEstado = new Set();
  const oyentesResincronizar = new Set();

  function fijarEstado(nuevo) {
    if (estado === nuevo) return;
    estado = nuevo;
    for (const oyente of [...oyentesEstado]) avisar(oyente, nuevo);
  }

  function resincronizar() {
    for (const oyente of [...oyentesResincronizar]) avisar(oyente);
  }

  function despachar(nombre, datos) {
    const evento = normalizarEvento(nombre, datos);
    if (!evento) {
      // Versión desconocida o datos inesperados: no se interpretan, se vuelve a consultar.
      resincronizar();
      return;
    }
    for (const oyente of [...(oyentesEvento.get(nombre) ?? [])]) avisar(oyente, evento);
  }

  async function ticketParaConectar() {
    if (ticketReservado) {
      const ticket = ticketReservado;
      ticketReservado = null;
      return ticket;
    }
    try {
      return (await pedirTicket()).ticket;
    } catch (error) {
      if (error instanceof ErrorTicketPermanente) permanente = true;
      throw error;
    }
  }

  const politicaReconexion = {
    nextRetryDelayInMilliseconds: ({ previousRetryCount }) =>
      permanente || usuarios === 0 ? null : retrasoReintento(previousRetryCount, aleatorio),
  };

  function cancelarReintento() {
    if (temporizadorReintento !== null) {
      cancelarProgramado(temporizadorReintento);
      temporizadorReintento = null;
    }
  }

  function programarReintento() {
    if (temporizadorReintento !== null || usuarios === 0 || permanente) return;
    const espera = retrasoReintento(reintentos, aleatorio);
    reintentos += 1;
    temporizadorReintento = programar(() => {
      temporizadorReintento = null;
      void iniciar();
    }, espera);
  }

  async function iniciar() {
    if (conexion || iniciando || permanente || usuarios === 0) return;
    cancelarReintento();
    iniciando = true;
    const miGeneracion = ++generacion;
    fijarEstado(ESTADOS.CONECTANDO);

    let nueva = null;
    try {
      const [signalR, credencial] = await Promise.all([cargarSignalR(), pedirTicket()]);
      if (miGeneracion !== generacion) return;

      ticketReservado = credencial.ticket;
      nueva = new signalR.HubConnectionBuilder()
        .withUrl(credencial.url, {
          // El servidor solo acepta WebSocket y sin negociación: una única solicitud, que
          // lleva el ticket en access_token.
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
          accessTokenFactory: ticketParaConectar,
        })
        .withAutomaticReconnect(politicaReconexion)
        .configureLogging(signalR.LogLevel.None)
        .build();

      for (const nombre of NOMBRES_EVENTOS) {
        nueva.on(nombre, (datos) => despachar(nombre, datos));
      }
      const esta = nueva;
      nueva.onreconnecting(() => {
        if (conexion === esta) fijarEstado(ESTADOS.RECONECTANDO);
      });
      nueva.onreconnected(() => {
        if (conexion !== esta) return;
        reintentos = 0;
        fijarEstado(ESTADOS.CONECTADO);
        resincronizar();
      });
      nueva.onclose(() => {
        if (conexion !== esta) return; // se cerró a propósito
        conexion = null;
        if (permanente) {
          fijarEstado(ESTADOS.NO_DISPONIBLE);
          return;
        }
        fijarEstado(ESTADOS.DESCONECTADO);
        programarReintento();
      });

      conexion = nueva;
      await nueva.start();
      if (miGeneracion !== generacion) return;

      reintentos = 0;
      fijarEstado(ESTADOS.CONECTADO);
      // Lo que cambió entre la carga inicial de cada vista y este momento.
      resincronizar();
    } catch (error) {
      if (miGeneracion !== generacion) return;
      ticketReservado = null;
      if (conexion === nueva) conexion = null;
      if (error instanceof ErrorTicketPermanente) permanente = true;
      if (permanente) {
        fijarEstado(ESTADOS.NO_DISPONIBLE);
        return;
      }
      fijarEstado(ESTADOS.DESCONECTADO);
      programarReintento();
    } finally {
      if (miGeneracion === generacion) iniciando = false;
    }
  }

  function detener() {
    generacion += 1;
    iniciando = false;
    reintentos = 0;
    ticketReservado = null;
    cancelarReintento();
    dejarDeEscucharEntorno();
    const actual = conexion;
    conexion = null;
    if (actual) {
      actual.stop().catch(() => {});
    }
    if (!permanente) fijarEstado(ESTADOS.INACTIVO);
  }

  /** Al recuperar la red o volver a la pestaña no se espera al siguiente reintento. */
  function reintentarAhora() {
    if (usuarios === 0 || permanente || conexion || iniciando) return;
    reintentos = 0;
    void iniciar();
  }

  function alVolverVisible() {
    if (entorno?.document?.visibilityState !== "hidden") reintentarAhora();
  }

  function escucharEntorno() {
    if (escuchandoEntorno || !entorno?.addEventListener) return;
    escuchandoEntorno = true;
    entorno.addEventListener("online", reintentarAhora);
    entorno.document?.addEventListener?.("visibilitychange", alVolverVisible);
  }

  function dejarDeEscucharEntorno() {
    if (!escuchandoEntorno) return;
    escuchandoEntorno = false;
    entorno.removeEventListener("online", reintentarAhora);
    entorno.document?.removeEventListener?.("visibilitychange", alVolverVisible);
  }

  /**
   * Registra un componente que necesita la conexión.
   * @returns {() => void} Función que lo da de baja (idempotente).
   */
  function usar() {
    usuarios += 1;
    if (temporizadorCierre !== null) {
      cancelarProgramado(temporizadorCierre);
      temporizadorCierre = null;
    }
    escucharEntorno();
    // Si espera un reintento, un componente nuevo no adelanta la espera progresiva.
    if (temporizadorReintento === null) void iniciar();

    let liberado = false;
    return () => {
      if (liberado) return;
      liberado = true;
      usuarios -= 1;
      if (usuarios > 0) return;
      // Una breve espera evita cerrar y reabrir al cambiar de vista o al remontar en desarrollo.
      temporizadorCierre = programar(() => {
        temporizadorCierre = null;
        if (usuarios === 0) detener();
      }, esperaAntesDeCerrar);
    };
  }

  function suscribir(conjunto, oyente) {
    conjunto.add(oyente);
    return () => conjunto.delete(oyente);
  }

  return {
    usar,
    on(nombre, oyente) {
      const conjunto = oyentesEvento.get(nombre);
      if (!conjunto) throw new Error(`Evento de tiempo real desconocido: ${nombre}`);
      return suscribir(conjunto, oyente);
    },
    alCambiarEstado: (oyente) => suscribir(oyentesEstado, oyente),
    alResincronizar: (oyente) => suscribir(oyentesResincronizar, oyente),
    estadoActual: () => estado,
    reintentarAhora,
  };
}

let gestorDeLaPestana = null;

/** Gestor compartido de esta pestaña (se crea al primer uso, solo en el navegador). */
export function obtenerGestorTiempoReal() {
  if (!gestorDeLaPestana) gestorDeLaPestana = crearGestorTiempoReal();
  return gestorDeLaPestana;
}
