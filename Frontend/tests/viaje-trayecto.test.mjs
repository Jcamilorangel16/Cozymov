// Pruebas de cuándo un viaje en curso pasa a estar en trayecto.
import assert from "node:assert/strict";
import { test } from "node:test";
import { viajeEnTrayecto } from "../src/features/viaje-en-curso/utils/trayecto.js";

const ahora = new Date("2030-01-10T15:30:00");

test("antes de la hora de salida el viaje todavía no está en trayecto", () => {
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-10", hora_salida: "15:31" }, ahora), false);
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-11", hora_salida: "06:00" }, ahora), false);
});

test("llegada la hora de salida el viaje está en trayecto", () => {
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-10", hora_salida: "15:30" }, ahora), true);
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-10", hora_salida: "08:00" }, ahora), true);
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-09", hora_salida: "23:59" }, ahora), true);
});

test("acepta fecha con hora, hora con segundos y datos incompletos sin fallar", () => {
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-10T00:00:00", hora_salida: "15:00:00" }, ahora), true);
  // Sin hora se toma el inicio del día.
  assert.equal(viajeEnTrayecto({ fecha_salida: "2030-01-10" }, ahora), true);
  assert.equal(viajeEnTrayecto({}, ahora), false);
  assert.equal(viajeEnTrayecto(null, ahora), false);
  assert.equal(viajeEnTrayecto({ fecha_salida: "no-es-fecha", hora_salida: "10:00" }, ahora), false);
});
