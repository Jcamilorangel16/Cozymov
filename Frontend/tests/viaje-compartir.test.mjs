// Pruebas del mensaje con el que el pasajero comparte su viaje por WhatsApp.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  textoCompartirViaje,
  urlCompartirWhatsApp,
} from "../src/features/viaje-en-curso/utils/compartir.js";

const viaje = {
  id_viaje: 15,
  origen: "Universidad Popular del Cesar",
  destino: "Centro Comercial Guatapurí",
  fecha_salida: "2026-11-20",
  hora_salida: "07:30",
  precio_pasaje: 3000,
  id_usuario_conductor: 42,
  nombre_conductor: "Carlos Pérez",
};

test("el mensaje incluye ruta, salida, conductor, precio y estado", () => {
  const texto = textoCompartirViaje(viaje, "En trayecto");

  assert.match(texto, /Origen: Universidad Popular del Cesar/);
  assert.match(texto, /Destino: Centro Comercial Guatapurí/);
  assert.match(texto, /Salida: .*2026.* a las 07:30/);
  assert.match(texto, /Conductor: Carlos Pérez/);
  assert.match(texto, /Precio: .*3\.000/);
  assert.match(texto, /Estado: En trayecto/);
});

test("el mensaje no expone ids internos", () => {
  const texto = textoCompartirViaje(viaje, "Reserva confirmada");
  assert.doesNotMatch(texto, /\b15\b|\b42\b/);
});

test("los datos que faltan se muestran como no disponibles", () => {
  const texto = textoCompartirViaje({ precio_pasaje: 0 }, "");

  assert.match(texto, /Origen: No disponible/);
  assert.match(texto, /Salida: No disponible/);
  assert.match(texto, /Conductor: No disponible/);
  assert.match(texto, /Precio: Modo colaboración/);
  assert.match(texto, /Estado: No disponible/);
});

test("el enlace abre WhatsApp sin número y con el texto codificado", () => {
  const mensaje = textoCompartirViaje(viaje, "En trayecto");
  const url = new URL(urlCompartirWhatsApp(mensaje));

  assert.equal(url.origin, "https://wa.me");
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("text"), mensaje);
});
