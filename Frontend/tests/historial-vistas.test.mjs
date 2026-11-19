// Pruebas del historial de secciones del menú (flecha «volver»).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_HISTORIAL_VISTAS,
  apilarVista,
  desapilarVista,
} from "../src/features/menu-principal/utils/historialVistas.js";

test("de Buscar a En curso, volver regresa a Buscar", () => {
  const historial = apilarVista([], "buscar", "en-curso");
  assert.deepEqual(historial, ["buscar"]);
  const { destino, historial: resto } = desapilarVista(historial);
  assert.equal(destino, "buscar");
  assert.deepEqual(resto, []);
});

test("volver recorre las secciones en orden inverso", () => {
  let h = [];
  h = apilarVista(h, "inicio", "buscar");
  h = apilarVista(h, "buscar", "en-curso");
  h = apilarVista(h, "en-curso", "mensajes");
  const a = desapilarVista(h);
  assert.equal(a.destino, "en-curso");
  const b = desapilarVista(a.historial);
  assert.equal(b.destino, "buscar");
  const c = desapilarVista(b.historial);
  assert.equal(c.destino, "inicio");
  assert.equal(desapilarVista(c.historial).destino, null);
});

test("ir a la misma sección no agrega nada", () => {
  const h = ["inicio"];
  assert.equal(apilarVista(h, "buscar", "buscar"), h);
});

test("apilar no modifica el historial original", () => {
  const h = ["inicio"];
  apilarVista(h, "buscar", "ofrecer");
  assert.deepEqual(h, ["inicio"]);
});

test("sin historial no hay a dónde volver", () => {
  assert.deepEqual(desapilarVista([]), { destino: null, historial: [] });
});

test("el historial tiene un tope y conserva lo más reciente", () => {
  let h = [];
  for (let i = 0; i < MAX_HISTORIAL_VISTAS + 5; i++) h = apilarVista(h, `v${i}`, "otra");
  assert.equal(h.length, MAX_HISTORIAL_VISTAS);
  assert.equal(h[h.length - 1], `v${MAX_HISTORIAL_VISTAS + 4}`);
});
