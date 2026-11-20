// Pruebas de cómo las vistas aplican los eventos de tiempo real: conversación abierta,
// avisos de mensajes y cambios del viaje en curso.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fusionarMensaje,
  marcarLeidosHasta,
  mensajeDesdeEvento,
  perteneceAConversacion,
  reconciliarMensajes,
} from "../src/features/mensajes/utils/tiempoRealMensajes.js";
import { detectarMensajesNuevos, registrarMensajeAvisado } from "../src/features/mensajes/utils/avisosMensajes.js";
import { avisoCambioViaje } from "../src/features/viaje-en-curso/utils/cambiosViaje.js";

const mensaje = (id, emisor, receptor, minuto, extra = {}) => ({
  id_mensaje: id,
  id_emisor: emisor,
  id_receptor: receptor,
  contenido: `m${id}`,
  fecha_hora: `2026-11-19T15:${String(minuto).padStart(2, "0")}:00Z`,
  leido: false,
  ...extra,
});

// --- Conversación ---

test("un evento solo pertenece a la conversación entre sus dos participantes", () => {
  const evento = { idEmisor: 1, idReceptor: 2 };
  assert.equal(perteneceAConversacion(evento, "2", "1"), true);
  assert.equal(perteneceAConversacion(evento, "1", "2"), true);
  assert.equal(perteneceAConversacion(evento, "2", "3"), false);
  assert.equal(perteneceAConversacion(evento, "3", "1"), false);
});

test("el mensaje del evento tiene la forma de /api/mensajes y llega sin leer", () => {
  assert.deepEqual(
    mensajeDesdeEvento({ idMensaje: 5, idEmisor: 1, idReceptor: 2, contenido: "hola", fechaHora: "2026-11-19T15:00:00Z" }),
    { id_mensaje: 5, id_emisor: 1, id_receptor: 2, contenido: "hola", fecha_hora: "2026-11-19T15:00:00Z", leido: false },
  );
});

test("un mensaje que llega por evento y por HTTP no se duplica y queda en orden", () => {
  const lista = [mensaje(1, 1, 2, 0), mensaje(3, 2, 1, 2)];

  const conNuevo = fusionarMensaje(lista, mensaje(2, 1, 2, 1));
  assert.deepEqual(conNuevo.map((m) => m.id_mensaje), [1, 2, 3]);
  assert.equal(fusionarMensaje(conNuevo, mensaje(2, 1, 2, 1)), conNuevo);
});

test("una respuesta HTTP lenta no borra un mensaje que llegó después por evento", () => {
  const enPantalla = [mensaje(1, 1, 2, 0), mensaje(2, 1, 2, 1)];
  const servidor = [mensaje(1, 1, 2, 0, { leido: true })];

  const resultado = reconciliarMensajes(enPantalla, servidor);

  assert.deepEqual(resultado.map((m) => m.id_mensaje), [1, 2]);
  assert.equal(resultado[0].leido, true); // el servidor manda en lo que conoce
  assert.equal(reconciliarMensajes([], servidor), servidor);
});

test("la lectura marca solo los mensajes del emisor hasta el id indicado", () => {
  const lista = [mensaje(1, 1, 2, 0), mensaje(2, 2, 1, 1), mensaje(3, 1, 2, 2), mensaje(4, 1, 2, 3)];

  const resultado = marcarLeidosHasta(lista, "1", 3);

  assert.deepEqual(resultado.map((m) => m.leido), [true, false, true, false]);
  assert.equal(marcarLeidosHasta(resultado, "1", 3), resultado);
});

// --- Avisos de mensajes ---

test("un mensaje avisado por tiempo real no se vuelve a avisar en la consulta periódica", () => {
  const previos = [{ id: "1", nombre: "Ana", ultimoMensaje: "hola", noLeidos: 1 }];
  const tras = registrarMensajeAvisado(previos, { id: "1", nombre: "Ana", texto: "¿vienes?" });
  const servidor = [{ id: "1", nombre: "Ana", ultimoMensaje: "¿vienes?", noLeidos: 2 }];

  assert.deepEqual(detectarMensajesNuevos(tras, servidor), []);
});

test("un remitente nuevo también cuenta como avisado", () => {
  const tras = registrarMensajeAvisado([], { id: "9", nombre: "Beto", texto: "hola" });

  assert.deepEqual(detectarMensajesNuevos(tras, [{ id: "9", nombre: "Beto", noLeidos: 1 }]), []);
  // Sin referencia todavía, la primera consulta sigue siendo solo referencia.
  assert.equal(registrarMensajeAvisado(null, { id: "9" }), null);
});

test("lo que llega mientras no hay conexión sí se avisa al resincronizar", () => {
  const previos = [{ id: "1", nombre: "Ana", noLeidos: 0 }];
  const servidor = [{ id: "1", nombre: "Ana", ultimoMensaje: "llegué", noLeidos: 1 }];

  assert.equal(detectarMensajesNuevos(previos, servidor).length, 1);
});

// --- Viaje en curso ---

test("quien hizo el cambio no recibe aviso", () => {
  assert.equal(avisoCambioViaje({ motivo: "reserva-cancelada", rolAnterior: "pasajero", rolNuevo: null }), null);
  assert.equal(avisoCambioViaje({ motivo: "reserva-finalizada", rolAnterior: "pasajero", rolNuevo: null }), null);
  assert.equal(avisoCambioViaje({ motivo: "viaje-cancelado", rolAnterior: "conductor", rolNuevo: null }), null);
  assert.equal(avisoCambioViaje({ motivo: "reserva-creada", rolAnterior: null, rolNuevo: "pasajero" }), null);
  assert.equal(avisoCambioViaje({ motivo: "solicitud-aceptada", rolAnterior: null, rolNuevo: "conductor" }), null);
  assert.equal(avisoCambioViaje({ motivo: "viaje-modificado", rolAnterior: "conductor", rolNuevo: "conductor" }), null);
});

test("la otra parte recibe un aviso del cambio", () => {
  assert.equal(
    avisoCambioViaje({ motivo: "reserva-cancelada", rolAnterior: "conductor", rolNuevo: null }).titulo,
    "Un pasajero salió del viaje",
  );
  assert.match(
    avisoCambioViaje({ motivo: "reserva-cancelada", rolAnterior: "conductor", rolNuevo: "conductor" }).texto,
    /demás pasajeros/,
  );
  assert.equal(
    avisoCambioViaje({ motivo: "reserva-finalizada", rolAnterior: "conductor", rolNuevo: null }).titulo,
    "Tu pasajero finalizó el viaje",
  );
  for (const motivo of ["viaje-cancelado", "viaje-eliminado"]) {
    assert.equal(
      avisoCambioViaje({ motivo, rolAnterior: "pasajero", rolNuevo: null }).titulo,
      "El conductor canceló el viaje",
    );
  }
  assert.equal(
    avisoCambioViaje({ motivo: "reserva-creada", rolAnterior: null, rolNuevo: "conductor" }).titulo,
    "¡Tienes un pasajero!",
  );
  assert.equal(
    avisoCambioViaje({ motivo: "solicitud-aceptada", rolAnterior: null, rolNuevo: "pasajero" }).titulo,
    "¡Aceptaron tu solicitud!",
  );
  assert.equal(
    avisoCambioViaje({ motivo: "viaje-modificado", rolAnterior: "pasajero", rolNuevo: "pasajero" }).icono,
    "info",
  );
});

test("un motivo desconocido no muestra aviso (solo se vuelve a consultar)", () => {
  assert.equal(avisoCambioViaje({ motivo: "otro", rolAnterior: "pasajero", rolNuevo: "pasajero" }), null);
});
