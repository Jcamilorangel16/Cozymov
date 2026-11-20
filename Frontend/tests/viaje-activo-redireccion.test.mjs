// Pruebas de cuándo llevar al usuario a «En curso» porque aceptaron su viaje.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claveViajeActivo,
  decidirRedireccion,
  textoViajeAceptado,
} from "../src/features/menu-principal/utils/viajeActivo.js";

test("identifica el viaje activo por rol e id, o null si no hay", () => {
  assert.equal(claveViajeActivo({ viaje: { id_viaje: 7 }, rol: "pasajero" }), "pasajero:7");
  assert.equal(claveViajeActivo({ viaje: { id_viaje: 7 }, rol: "conductor" }), "conductor:7");
  assert.equal(claveViajeActivo({ viaje: { id_viaje: 7 } }), "pasajero:7");
  assert.equal(claveViajeActivo({ viaje: null, rol: null }), null);
  assert.equal(claveViajeActivo({ viaje: {} }), null);
  assert.equal(claveViajeActivo(null), null);
});

test("un viaje nuevo lleva a «En curso» y avisa", () => {
  for (const esPrimeraConsulta of [true, false]) {
    assert.deepEqual(
      decidirRedireccion({
        clave: "pasajero:7",
        claveVista: null,
        esPrimeraConsulta,
        vistaActiva: "inicio",
      }),
      { redirigir: true, avisar: true },
    );
  }
  // Otro viaje distinto del último visto también es nuevo.
  assert.deepEqual(
    decidirRedireccion({
      clave: "conductor:9",
      claveVista: "pasajero:7",
      esPrimeraConsulta: false,
      vistaActiva: "buscar",
    }),
    { redirigir: true, avisar: true },
  );
});

test("al abrir la app con un viaje ya visto entra a «En curso» sin repetir el aviso", () => {
  assert.deepEqual(
    decidirRedireccion({
      clave: "pasajero:7",
      claveVista: "pasajero:7",
      esPrimeraConsulta: true,
      vistaActiva: "inicio",
    }),
    { redirigir: true, avisar: false },
  );
});

test("si el usuario ya salió de «En curso» a propósito, no lo devuelve", () => {
  assert.deepEqual(
    decidirRedireccion({
      clave: "pasajero:7",
      claveVista: "pasajero:7",
      esPrimeraConsulta: false,
      vistaActiva: "mensajes",
    }),
    { redirigir: false, avisar: false },
  );
});

test("no hace nada sin viaje o si ya está en «En curso»", () => {
  const nada = { redirigir: false, avisar: false };
  assert.deepEqual(
    decidirRedireccion({ clave: null, claveVista: null, esPrimeraConsulta: true, vistaActiva: "inicio" }),
    nada,
  );
  assert.deepEqual(
    decidirRedireccion({
      clave: "conductor:9",
      claveVista: null,
      esPrimeraConsulta: false,
      vistaActiva: "en-curso",
    }),
    nada,
  );
});

test("el aviso dice quién aceptó según el rol", () => {
  const pasajero = textoViajeAceptado({
    viaje: { origen: "UPC", destino: "Centro" },
    rol: "pasajero",
  });
  assert.equal(pasajero.titulo, "¡Aceptaron tu viaje!");
  assert.match(pasajero.texto, /Un conductor aceptó tu viaje \(UPC → Centro\)/);

  const conductor = textoViajeAceptado({
    viaje: { nombre_pasajero: "Ana Díaz" },
    rol: "conductor",
  });
  assert.equal(conductor.titulo, "¡Tienes un pasajero!");
  assert.match(conductor.texto, /^Ana Díaz se unió a tu viaje\./);

  assert.match(
    textoViajeAceptado({ viaje: { nombre_pasajero: "No disponible" }, rol: "conductor" }).texto,
    /^Un pasajero se unió/,
  );
});
