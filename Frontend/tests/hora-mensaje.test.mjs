import assert from "node:assert/strict";
import test from "node:test";
import {
  horaLocalMensaje,
  parsearFechaMensaje,
} from "../src/features/mensajes/utils/horaMensaje.js";

test("una fecha con Z se interpreta como UTC", () => {
  assert.equal(parsearFechaMensaje("2026-11-18T15:30:00Z").toISOString(), "2026-11-18T15:30:00.000Z");
});

test("una fecha sin zona horaria se asume UTC, no hora local", () => {
  assert.equal(parsearFechaMensaje("2026-11-18T15:30:00").toISOString(), "2026-11-18T15:30:00.000Z");
});

test("respeta un desfase explícito", () => {
  assert.equal(parsearFechaMensaje("2026-11-18T10:30:00-05:00").toISOString(), "2026-11-18T15:30:00.000Z");
});

test("la fecha vacía de mensajes antiguos (año 0001) no se muestra como hora", () => {
  assert.equal(parsearFechaMensaje("0001-01-01T00:00:00Z"), null);
  assert.equal(horaLocalMensaje("0001-01-01T00:00:00"), "");
});

test("valores inválidos devuelven vacío", () => {
  assert.equal(parsearFechaMensaje(undefined), null);
  assert.equal(horaLocalMensaje("no es fecha"), "");
});

test("la hora mostrada coincide con la hora local del dispositivo", () => {
  const iso = "2026-11-18T15:30:00Z";
  const esperado = new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  assert.equal(horaLocalMensaje(iso), esperado);
});
