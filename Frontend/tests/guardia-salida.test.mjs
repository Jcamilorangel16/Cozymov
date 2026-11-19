// Pruebas de la protección contra salir de la plataforma con el botón «atrás».
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MARCA_GUARDIA,
  instalarGuardiaSalida,
} from "../src/features/menu-principal/utils/guardiaSalida.js";

/** Ventana falsa: registra los pushState y go, y deja disparar eventos a mano. */
function crearVentana({ activada = true } = {}) {
  const oyentes = new Map();
  const ventana = {
    pushes: 0,
    saltos: [],
    location: { href: "http://localhost/menu" },
    navigator: { userActivation: { hasBeenActive: activada } },
    history: {
      state: null,
      pushState(estado) {
        ventana.pushes += 1;
        this.state = estado;
      },
      go(n) {
        ventana.saltos.push(n);
      },
    },
    addEventListener(tipo, fn) {
      if (!oyentes.has(tipo)) oyentes.set(tipo, new Set());
      oyentes.get(tipo).add(fn);
    },
    removeEventListener(tipo, fn) {
      oyentes.get(tipo)?.delete(fn);
    },
    emitir(tipo) {
      for (const fn of [...(oyentes.get(tipo) ?? [])]) fn({});
    },
    cantidadOyentes: (tipo) => oyentes.get(tipo)?.size ?? 0,
  };
  return ventana;
}

/** Simula «atrás»: el navegador queda en la entrada real del menú, que no lleva la marca. */
function irAtras(ventana) {
  ventana.history.state = null;
  ventana.emitir("popstate");
}

/** Pregunta controlable: `responder(true|false)` simula el botón elegido. */
function crearPregunta() {
  const estado = { preguntas: 0, cerradas: 0, responder: null };
  return {
    estado,
    acciones: {
      pedirConfirmacion: () =>
        new Promise((resolver) => {
          estado.preguntas += 1;
          estado.responder = resolver;
        }),
      cerrarConfirmacion: () => {
        estado.cerradas += 1;
        estado.responder?.(false); // cerrar una ventana de SweetAlert la descarta
      },
    },
  };
}

const esperar = () => new Promise((resolver) => setImmediate(resolver));

test("al abrir el menú se coloca una entrada centinela, una sola aunque el efecto corra dos veces", () => {
  const ventana = crearVentana();
  const { acciones } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);
  instalarGuardiaSalida(ventana, acciones); // React en modo estricto
  assert.equal(ventana.pushes, 1);
  assert.equal(ventana.history.state[MARCA_GUARDIA], true);
});

test("el primer «atrás» no sale: repone el centinela y pregunta", () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);

  irAtras(ventana);

  assert.equal(estado.preguntas, 1);
  assert.equal(ventana.pushes, 2);
  assert.deepEqual(ventana.saltos, []);
});

test("«Quedarme» no sale y permite que otro «atrás» vuelva a preguntar", async () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);

  irAtras(ventana);
  estado.responder(false);
  await esperar();
  assert.deepEqual(ventana.saltos, []);

  irAtras(ventana);
  assert.equal(estado.preguntas, 2);
});

test("«Sí, salir» sale de la plataforma retrocediendo el centinela y la entrada del menú", async () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);

  irAtras(ventana);
  estado.responder(true);
  await esperar();

  assert.deepEqual(ventana.saltos, [-2]);
});

test("un segundo «atrás» con la pregunta abierta cierra la ventana y sale una sola vez", async () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);

  irAtras(ventana);
  irAtras(ventana);
  await esperar();

  assert.equal(estado.cerradas, 1);
  assert.deepEqual(ventana.saltos, [-1]);
  assert.equal(ventana.pushes, 2, "al salir ya no se repone el centinela");
});

test("llegar al centinela hacia adelante no cuenta como «atrás»", () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);

  ventana.emitir("popstate"); // el estado sigue siendo el centinela
  assert.equal(estado.preguntas, 0);
});

test("si ya hay otra ventana emergente abierta no se pisa: solo se retiene el «atrás»", () => {
  const ventana = crearVentana();
  const { acciones, estado } = crearPregunta();
  instalarGuardiaSalida(ventana, { ...acciones, hayOtroAviso: () => true });

  irAtras(ventana);

  assert.equal(estado.preguntas, 0);
  assert.equal(ventana.pushes, 2);
  assert.deepEqual(ventana.saltos, []);
});

test("sin interacción previa el centinela espera al primer toque o tecla", () => {
  const ventana = crearVentana({ activada: false });
  const { acciones } = crearPregunta();
  instalarGuardiaSalida(ventana, acciones);
  assert.equal(ventana.pushes, 0);

  ventana.emitir("pointerdown");
  assert.equal(ventana.pushes, 1);
  assert.equal(ventana.cantidadOyentes("keydown"), 0, "los oyentes de interacción se retiran");
  ventana.emitir("keydown");
  assert.equal(ventana.pushes, 1);
});

test("al desmontar se quitan los oyentes", () => {
  const ventana = crearVentana({ activada: false });
  const { acciones, estado } = crearPregunta();
  const quitar = instalarGuardiaSalida(ventana, acciones);
  quitar();

  assert.equal(ventana.cantidadOyentes("popstate"), 0);
  assert.equal(ventana.cantidadOyentes("pointerdown"), 0);
  irAtras(ventana);
  assert.equal(estado.preguntas, 0);
});
