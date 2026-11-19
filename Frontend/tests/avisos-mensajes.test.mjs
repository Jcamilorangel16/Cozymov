// Pruebas de la detección de mensajes nuevos para notificar al usuario.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectarMensajesNuevos,
  resumirMensaje,
  textoAvisoMensajes,
} from "../src/features/mensajes/utils/avisosMensajes.js";

const chat = (id, noLeidos, extra = {}) => ({
  id: String(id),
  nombre: `Contacto ${id}`,
  ultimoMensaje: "hola",
  noLeidos,
  ...extra,
});

test("la primera consulta solo es referencia: no avisa de mensajes que ya estaban", () => {
  assert.deepEqual(detectarMensajesNuevos(null, [chat(1, 3)]), []);
});

test("avisa cuando los no leídos de un chat aumentan", () => {
  const nuevos = detectarMensajesNuevos([chat(1, 0)], [chat(1, 1, { ultimoMensaje: "¿Ya vienes?" })]);
  assert.deepEqual(nuevos, [{ id: "1", nombre: "Contacto 1", texto: "¿Ya vienes?", cantidad: 1 }]);
});

test("un chat que aparece por primera vez con mensajes sin leer también avisa", () => {
  const nuevos = detectarMensajesNuevos([chat(1, 0)], [chat(1, 0), chat(2, 2)]);
  assert.equal(nuevos.length, 1);
  assert.equal(nuevos[0].id, "2");
  assert.equal(nuevos[0].cantidad, 2);
});

test("solo cuenta los mensajes nuevos, no los que ya estaban sin leer", () => {
  const nuevos = detectarMensajesNuevos([chat(1, 2)], [chat(1, 5)]);
  assert.equal(nuevos[0].cantidad, 3);
});

test("no avisa si los no leídos siguen igual o bajan (el usuario los leyó)", () => {
  assert.deepEqual(detectarMensajesNuevos([chat(1, 2)], [chat(1, 2)]), []);
  assert.deepEqual(detectarMensajesNuevos([chat(1, 2)], [chat(1, 0)]), []);
});

test("compara por id aunque llegue como número o texto, y tolera datos incompletos", () => {
  assert.equal(detectarMensajesNuevos([{ id: 1, noLeidos: 0 }], [{ id: "1", noLeidos: 1 }]).length, 1);
  assert.deepEqual(detectarMensajesNuevos([chat(1, 0)], [{ id: "1" }]), []);
  assert.equal(detectarMensajesNuevos([], [{ id: "9", noLeidos: 1 }])[0].nombre, "un contacto");
  assert.deepEqual(detectarMensajesNuevos([], null), []);
});

test("los mensajes largos se recortan y se normalizan los espacios", () => {
  assert.equal(resumirMensaje("  hola \n  mundo  "), "hola mundo");
  const largo = resumirMensaje("a".repeat(300));
  assert.equal(largo.length, 120);
  assert.ok(largo.endsWith("…"));
});

test("el texto del aviso distingue uno, varios mensajes y varios chats", () => {
  assert.deepEqual(textoAvisoMensajes([{ nombre: "Ana Pérez", texto: "Ya llegué", cantidad: 1 }]), {
    titulo: "Nuevo mensaje de Ana Pérez",
    texto: "Ya llegué",
  });
  assert.equal(
    textoAvisoMensajes([{ nombre: "Ana", texto: "x", cantidad: 3 }]).titulo,
    "3 mensajes nuevos de Ana",
  );
  assert.equal(
    textoAvisoMensajes([
      { nombre: "Ana", texto: "", cantidad: 1 },
      { nombre: "Luis", texto: "", cantidad: 1 },
      { nombre: "Eva", texto: "", cantidad: 1 },
    ]).texto,
    "Tienes mensajes nuevos de Ana, Luis y Eva.",
  );
});
