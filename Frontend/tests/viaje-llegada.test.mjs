// Pruebas de la detección de llegada al destino por GPS.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LECTURAS_PARA_LLEGAR,
  METROS_LLEGADA,
  MS_AUTOFINALIZAR,
  PRECISION_MAXIMA_METROS,
  borrarLlegada,
  contarLecturasEnDestino,
  debeAutofinalizar,
  esLecturaDeLlegada,
  guardarLlegada,
  leerLlegada,
  limiteAutofinalizar,
  llegadaConfirmada,
} from "../src/features/viaje-en-curso/utils/llegada.js";

test("dentro del radio y con buena precisión cuenta como llegada", () => {
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 30, precision: 12 }), true);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: METROS_LLEGADA, precision: 20 }), true);
});

test("fuera del radio no cuenta como llegada", () => {
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: METROS_LLEGADA + 1, precision: 5 }), false);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 2500, precision: 5 }), false);
});

test("una lectura imprecisa no cuenta aunque el punto caiga dentro del radio", () => {
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 40, precision: PRECISION_MAXIMA_METROS + 1 }), false);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 40, precision: PRECISION_MAXIMA_METROS }), true);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 40, precision: Number.NaN }), false);
});

test("sin dato de precisión se confía en la distancia; una distancia inválida nunca cuenta", () => {
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 40 }), true);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 40, precision: null }), true);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: Number.NaN, precision: 5 }), false);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: Infinity, precision: 5 }), false);
});

test("se puede cambiar el radio de llegada", () => {
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 250, precision: 5 }, 300), true);
  assert.equal(esLecturaDeLlegada({ metrosAlDestino: 250, precision: 5 }, 200), false);
});

test("la llegada se confirma con lecturas consecutivas y se reinicia si el usuario sale del radio", () => {
  let n = 0;
  n = contarLecturasEnDestino(n, true);
  assert.equal(llegadaConfirmada(n), LECTURAS_PARA_LLEGAR <= 1);
  n = contarLecturasEnDestino(n, false); // una lectura fuera: empieza de nuevo
  assert.equal(n, 0);
  for (let i = 0; i < LECTURAS_PARA_LLEGAR; i++) n = contarLecturasEnDestino(n, true);
  assert.equal(llegadaConfirmada(n), true);
});

test("una sola lectura dentro del radio no basta", () => {
  assert.equal(llegadaConfirmada(contarLecturasEnDestino(0, true)), false);
  assert.equal(llegadaConfirmada(0), false);
});

test("el viaje se finaliza solo exactamente una hora después de la llegada", () => {
  const llegada = Date.parse("2026-11-18T10:00:00");
  assert.equal(limiteAutofinalizar(llegada), llegada + MS_AUTOFINALIZAR);
  assert.equal(MS_AUTOFINALIZAR, 3_600_000);
  assert.equal(debeAutofinalizar(llegada, llegada + MS_AUTOFINALIZAR - 1), false);
  assert.equal(debeAutofinalizar(llegada, llegada + MS_AUTOFINALIZAR), true);
  assert.equal(debeAutofinalizar(null, llegada + MS_AUTOFINALIZAR * 5), false);
});

test("la hora de llegada se guarda, se lee y se borra por viaje", () => {
  const datos = new Map();
  const almacen = {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => datos.set(k, v),
    removeItem: (k) => datos.delete(k),
  };
  assert.equal(leerLlegada(almacen, 7), null);
  guardarLlegada(almacen, 7, 1234567);
  assert.equal(leerLlegada(almacen, 7), 1234567);
  assert.equal(leerLlegada(almacen, 8), null);
  borrarLlegada(almacen, 7);
  assert.equal(leerLlegada(almacen, 7), null);
});

test("sin almacenamiento o con datos corruptos no falla", () => {
  assert.equal(leerLlegada(null, 1), null);
  assert.equal(leerLlegada({ getItem: () => "abc" }, 1), null);
  assert.equal(leerLlegada({ getItem: () => { throw new Error("bloqueado"); } }, 1), null);
  assert.doesNotThrow(() => guardarLlegada({ setItem: () => { throw new Error("lleno"); } }, 1, 5));
});
