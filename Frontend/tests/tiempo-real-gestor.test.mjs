// Pruebas del gestor de la conexión de tiempo real: una sola conexión por pestaña,
// reconexión con espera progresiva, ticket nuevo en cada intento, resincronización por
// HTTP y parada definitiva cuando no hay sesión.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ESTADOS,
  ErrorTicketPermanente,
  crearGestorTiempoReal,
  pedirTicketAlServidor,
} from "../src/lib/tiempoReal/gestor.js";
import { normalizarEvento, retrasoReintento } from "../src/lib/tiempoReal/eventos.js";

const URL_HUB = "https://api.example/hubs/tiempo-real";
const esperar = async () => {
  for (let i = 0; i < 5; i += 1) await new Promise((resolver) => setImmediate(resolver));
};

/** Sustituto del paquete @microsoft/signalr con el comportamiento que usa el gestor. */
function crearSignalRFalso() {
  const signalR = {
    conexiones: [],
    fallosAlIniciar: 0,
    HttpTransportType: { WebSockets: 1 },
    LogLevel: { None: 6 },
  };

  class ConexionFalsa {
    constructor(url, opciones, politica) {
      Object.assign(this, { url, opciones, politica, tickets: [], detenida: false });
      this.manejadores = new Map();
      this.alCerrar = [];
      this.alReconectando = [];
      this.alReconectado = [];
      signalR.conexiones.push(this);
    }
    on(nombre, manejador) {
      this.manejadores.set(nombre, manejador);
    }
    onclose(manejador) {
      this.alCerrar.push(manejador);
    }
    onreconnecting(manejador) {
      this.alReconectando.push(manejador);
    }
    onreconnected(manejador) {
      this.alReconectado.push(manejador);
    }
    async start() {
      this.tickets.push(await this.opciones.accessTokenFactory());
      if (signalR.fallosAlIniciar > 0) {
        signalR.fallosAlIniciar -= 1;
        throw new Error("No se pudo abrir el WebSocket.");
      }
    }
    async stop() {
      this.detenida = true;
    }
    // Ayudas para simular al servidor.
    emitir(nombre, datos) {
      this.manejadores.get(nombre)?.(datos);
    }
    cerrarDesdeElServidor() {
      for (const manejador of this.alCerrar) manejador(new Error("cerrada"));
    }
    async reconectar() {
      for (const manejador of this.alReconectando) manejador();
      this.tickets.push(await this.opciones.accessTokenFactory());
      for (const manejador of this.alReconectado) manejador();
    }
  }

  signalR.HubConnectionBuilder = class {
    withUrl(url, opciones) {
      this.url = url;
      this.opciones = opciones;
      return this;
    }
    withAutomaticReconnect(politica) {
      this.politica = politica;
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return new ConexionFalsa(this.url, this.opciones, this.politica);
    }
  };
  return signalR;
}

/** Temporizadores manuales: nada corre hasta que la prueba lo pide. */
function crearRelojFalso() {
  let siguienteId = 1;
  const pendientes = new Map();
  return {
    programar(accion, ms) {
      const id = siguienteId++;
      pendientes.set(id, { accion, ms });
      return id;
    },
    cancelar(id) {
      pendientes.delete(id);
    },
    esperas: () => [...pendientes.values()].map(({ ms }) => ms),
    async correr() {
      const lista = [...pendientes.entries()];
      pendientes.clear();
      for (const [, { accion }] of lista) accion();
      await esperar();
    },
  };
}

function crearEntorno({ falloTicket = null } = {}) {
  const signalR = crearSignalRFalso();
  const reloj = crearRelojFalso();
  const ticket = { pedidos: 0, fallo: falloTicket };
  const gestor = crearGestorTiempoReal({
    cargarSignalR: async () => signalR,
    pedirTicket: async () => {
      ticket.pedidos += 1;
      if (ticket.fallo) throw ticket.fallo;
      return { ticket: `t${ticket.pedidos}`, url: URL_HUB };
    },
    programar: reloj.programar,
    cancelarProgramado: reloj.cancelar,
    aleatorio: () => 0.5,
    entorno: null,
  });
  return { gestor, signalR, reloj, ticket };
}

const mensajeNuevo = (extra = {}) => ({
  version: 1,
  idMensaje: 10,
  idEmisor: 1,
  idReceptor: 2,
  nombreEmisor: "Ana Díaz",
  contenido: "Hola",
  fechaHora: "2026-11-19T15:00:00Z",
  ...extra,
});

test("una sola conexión por pestaña aunque varios componentes la usen", async () => {
  const { gestor, signalR, ticket } = crearEntorno();

  gestor.usar();
  gestor.usar();
  gestor.usar();
  await esperar();

  assert.equal(signalR.conexiones.length, 1);
  assert.equal(ticket.pedidos, 1);
  assert.equal(gestor.estadoActual(), ESTADOS.CONECTADO);
  const [conexion] = signalR.conexiones;
  assert.equal(conexion.url, URL_HUB);
  assert.deepEqual(conexion.tickets, ["t1"]);
  // Solo WebSocket y sin negociación: el ticket va en la única solicitud.
  assert.equal(conexion.opciones.transport, signalR.HttpTransportType.WebSockets);
  assert.equal(conexion.opciones.skipNegotiation, true);
});

test("entrega los eventos a los suscriptores y deja de hacerlo al darse de baja", async () => {
  const { gestor, signalR } = crearEntorno();
  const recibidos = [];
  const baja = gestor.on("MensajeNuevo", (evento) => recibidos.push(evento));
  gestor.usar();
  await esperar();

  signalR.conexiones[0].emitir("MensajeNuevo", mensajeNuevo({ extra: "no se pasa" }));
  baja();
  signalR.conexiones[0].emitir("MensajeNuevo", mensajeNuevo({ idMensaje: 11 }));

  assert.equal(recibidos.length, 1);
  assert.equal(recibidos[0].idMensaje, 10);
  assert.equal(recibidos[0].extra, undefined);
});

test("un evento de otra versión no se interpreta: se resincroniza por HTTP", async () => {
  const { gestor, signalR } = crearEntorno();
  const recibidos = [];
  let resincronizaciones = 0;
  gestor.on("MensajeNuevo", (evento) => recibidos.push(evento));
  gestor.alResincronizar(() => (resincronizaciones += 1));
  gestor.usar();
  await esperar();
  resincronizaciones = 0;

  signalR.conexiones[0].emitir("MensajeNuevo", mensajeNuevo({ version: 2 }));

  assert.equal(recibidos.length, 0);
  assert.equal(resincronizaciones, 1);
});

test("un oyente que falla no impide la entrega a los demás", async () => {
  const { gestor, signalR } = crearEntorno();
  const errorOriginal = console.error;
  console.error = () => {};
  let entregado = false;
  gestor.on("ViajeActualizado", () => {
    throw new Error("fallo de un componente");
  });
  gestor.on("ViajeActualizado", () => (entregado = true));
  gestor.usar();
  await esperar();

  signalR.conexiones[0].emitir("ViajeActualizado", { version: 1, motivo: "reserva-creada", idViaje: 4 });
  console.error = errorOriginal;

  assert.equal(entregado, true);
});

test("al conectar se pide resincronizar lo que cambió durante la carga", async () => {
  const { gestor } = crearEntorno();
  let resincronizaciones = 0;
  gestor.alResincronizar(() => (resincronizaciones += 1));

  gestor.usar();
  await esperar();

  assert.equal(resincronizaciones, 1);
});

test("se cierra poco después de que el último componente la suelta", async () => {
  const { gestor, signalR, reloj } = crearEntorno();
  const liberarA = gestor.usar();
  const liberarB = gestor.usar();
  await esperar();

  liberarA();
  liberarA(); // liberar dos veces no descuenta dos veces
  assert.deepEqual(reloj.esperas(), []);
  liberarB();
  assert.deepEqual(reloj.esperas(), [1000]);
  await reloj.correr();

  assert.equal(signalR.conexiones[0].detenida, true);
  assert.equal(gestor.estadoActual(), ESTADOS.INACTIVO);
});

test("volver a usarla antes del cierre reutiliza la misma conexión", async () => {
  const { gestor, signalR, reloj } = crearEntorno();
  const liberar = gestor.usar();
  await esperar();

  liberar();
  gestor.usar(); // p. ej. al cambiar de vista o al remontar en desarrollo
  await reloj.correr();

  assert.equal(signalR.conexiones.length, 1);
  assert.equal(signalR.conexiones[0].detenida, false);
  assert.equal(gestor.estadoActual(), ESTADOS.CONECTADO);
});

test("si no puede conectar reintenta con espera progresiva y un ticket nuevo cada vez", async () => {
  const { gestor, signalR, reloj, ticket } = crearEntorno();
  signalR.fallosAlIniciar = 3;

  gestor.usar();
  await esperar();
  assert.equal(gestor.estadoActual(), ESTADOS.DESCONECTADO);

  const esperas = [];
  while (gestor.estadoActual() !== ESTADOS.CONECTADO) {
    esperas.push(...reloj.esperas());
    await reloj.correr();
  }

  assert.deepEqual(esperas, [0, 2000, 5000]);
  assert.equal(ticket.pedidos, 4);
  const usados = signalR.conexiones.flatMap((conexion) => conexion.tickets);
  assert.deepEqual(usados, ["t1", "t2", "t3", "t4"]);
});

test("tras un cierre del servidor vuelve a conectar y resincroniza", async () => {
  const { gestor, signalR, reloj } = crearEntorno();
  let resincronizaciones = 0;
  gestor.alResincronizar(() => (resincronizaciones += 1));
  gestor.usar();
  await esperar();

  signalR.conexiones[0].cerrarDesdeElServidor();
  assert.equal(gestor.estadoActual(), ESTADOS.DESCONECTADO);
  await reloj.correr();

  assert.equal(signalR.conexiones.length, 2);
  assert.equal(gestor.estadoActual(), ESTADOS.CONECTADO);
  assert.equal(resincronizaciones, 2);
});

test("la reconexión automática usa un ticket nuevo y resincroniza", async () => {
  const { gestor, signalR } = crearEntorno();
  const estados = [];
  let resincronizaciones = 0;
  gestor.alCambiarEstado((estado) => estados.push(estado));
  gestor.alResincronizar(() => (resincronizaciones += 1));
  gestor.usar();
  await esperar();

  await signalR.conexiones[0].reconectar();

  assert.deepEqual(signalR.conexiones[0].tickets, ["t1", "t2"]);
  assert.deepEqual(estados, [ESTADOS.CONECTANDO, ESTADOS.CONECTADO, ESTADOS.RECONECTANDO, ESTADOS.CONECTADO]);
  assert.equal(resincronizaciones, 2);
});

test("la política de reconexión espera cada vez más y se detiene sin componentes", async () => {
  const { gestor, signalR } = crearEntorno();
  const liberar = gestor.usar();
  await esperar();
  const { politica } = signalR.conexiones[0];

  const esperas = [0, 1, 2, 3, 4, 10].map((previousRetryCount) =>
    politica.nextRetryDelayInMilliseconds({ previousRetryCount }),
  );
  liberar();

  assert.deepEqual(esperas, [0, 2000, 5000, 10000, 20000, 30000]);
  assert.equal(politica.nextRetryDelayInMilliseconds({ previousRetryCount: 1 }), null);
});

test("sin sesión no reintenta: queda «no disponible» y la app sigue con HTTP", async () => {
  const { gestor, signalR, reloj } = crearEntorno({
    falloTicket: new ErrorTicketPermanente("Debes iniciar sesión."),
  });

  gestor.usar();
  await esperar();

  assert.equal(gestor.estadoActual(), ESTADOS.NO_DISPONIBLE);
  assert.equal(signalR.conexiones.length, 0);
  assert.deepEqual(reloj.esperas(), []);
});

test("si la sesión termina durante una reconexión, deja de reintentar", async () => {
  const { gestor, signalR, ticket } = crearEntorno();
  gestor.usar();
  await esperar();
  const [conexion] = signalR.conexiones;
  ticket.fallo = new ErrorTicketPermanente("Debes iniciar sesión.");

  await assert.rejects(conexion.opciones.accessTokenFactory());

  assert.equal(conexion.politica.nextRetryDelayInMilliseconds({ previousRetryCount: 0 }), null);
  conexion.cerrarDesdeElServidor();
  assert.equal(gestor.estadoActual(), ESTADOS.NO_DISPONIBLE);
});

test("un fallo pasajero del ticket se reintenta", async () => {
  const { gestor, reloj, ticket } = crearEntorno({ falloTicket: new Error("502") });

  gestor.usar();
  await esperar();
  assert.equal(gestor.estadoActual(), ESTADOS.DESCONECTADO);

  ticket.fallo = null;
  await reloj.correr();
  assert.equal(gestor.estadoActual(), ESTADOS.CONECTADO);
});

test("al recuperar la red reintenta enseguida en vez de esperar", async () => {
  const signalR = crearSignalRFalso();
  const reloj = crearRelojFalso();
  const entorno = new EventTarget();
  entorno.document = new EventTarget();
  entorno.document.visibilityState = "visible";
  const gestor = crearGestorTiempoReal({
    cargarSignalR: async () => signalR,
    pedirTicket: async () => ({ ticket: "t", url: URL_HUB }),
    programar: reloj.programar,
    cancelarProgramado: reloj.cancelar,
    aleatorio: () => 0.5,
    entorno,
  });
  signalR.fallosAlIniciar = 2;
  gestor.usar();
  await esperar();
  await reloj.correr(); // primer reintento (inmediato), también falla
  assert.deepEqual(reloj.esperas(), [2000]);

  entorno.dispatchEvent(new Event("online"));
  await esperar();

  assert.equal(gestor.estadoActual(), ESTADOS.CONECTADO);
  assert.deepEqual(reloj.esperas(), []);
});

test("pedirTicketAlServidor distingue los errores definitivos de los pasajeros", async () => {
  const llamadas = [];
  const responder = (status, cuerpo) => async (url, opciones) => {
    llamadas.push({ url, opciones });
    return new Response(JSON.stringify(cuerpo), { status });
  };

  assert.deepEqual(
    await pedirTicketAlServidor(responder(200, { ticket: "x", url: URL_HUB })),
    { ticket: "x", url: URL_HUB },
  );
  assert.equal(llamadas[0].url, "/api/tiempo-real/ticket");
  assert.equal(llamadas[0].opciones.method, "POST");
  assert.equal(llamadas[0].opciones.credentials, "same-origin");

  await assert.rejects(pedirTicketAlServidor(responder(401, {})), ErrorTicketPermanente);
  await assert.rejects(pedirTicketAlServidor(responder(503, { desactivado: true })), ErrorTicketPermanente);
  // El motivo del servidor llega al error para poder diagnosticar el 503.
  const infoOriginal = console.info;
  const mensajes = [];
  console.info = (mensaje) => mensajes.push(String(mensaje));
  try {
    await assert.rejects(
      pedirTicketAlServidor(responder(503, { desactivado: true, motivo: "backend_sin_tiempo_real" })),
      (error) => error instanceof ErrorTicketPermanente && error.motivo === "backend_sin_tiempo_real",
    );
  } finally {
    console.info = infoOriginal;
  }
  assert.match(mensajes.join("\n"), /motivo: backend_sin_tiempo_real/);
  for (const status of [429, 500, 502]) {
    await assert.rejects(pedirTicketAlServidor(responder(status, {})), (error) => !(error instanceof ErrorTicketPermanente));
  }
});

// --- Contratos ---

test("normaliza solo los campos del contrato y rechaza datos inválidos", () => {
  assert.deepEqual(normalizarEvento("MensajesLeidos", { version: 1, idLector: 2, idEmisor: 1, hastaIdMensaje: 9, x: 1 }), {
    version: 1,
    idLector: 2,
    idEmisor: 1,
    hastaIdMensaje: 9,
  });
  assert.equal(normalizarEvento("MensajeNuevo", mensajeNuevo({ idEmisor: "1" })), null);
  assert.equal(normalizarEvento("MensajeNuevo", mensajeNuevo({ contenido: "x".repeat(501) })), null);
  assert.equal(normalizarEvento("ViajeActualizado", { version: 1, motivo: "", idViaje: 3 }), null);
  assert.equal(normalizarEvento("ViajeActualizado", { version: 1, motivo: "nuevo-motivo", idViaje: 3 }).motivo, "nuevo-motivo");
  assert.equal(normalizarEvento("Desconocido", { version: 1 }), null);
  assert.equal(normalizarEvento("MensajeNuevo", null), null);
});

test("la espera de reintento tiene variación acotada y un máximo", () => {
  assert.equal(retrasoReintento(0, () => 0.99), 0);
  assert.equal(retrasoReintento(1, () => 0), 1600);
  assert.equal(retrasoReintento(1, () => 0.75), 2200);
  assert.ok(retrasoReintento(1, () => 0.999999) <= 2400);
  assert.equal(retrasoReintento(50, () => 0.5), 30000);
  assert.equal(retrasoReintento(-3, () => 0.5), 0);
});
