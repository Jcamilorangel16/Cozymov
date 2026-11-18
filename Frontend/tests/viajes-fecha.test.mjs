// Pruebas de la fecha y la hora al publicar un viaje: se permite hoy a cualquier hora.
import assert from "node:assert/strict";
import { test } from "node:test";
import { validarDatosNuevoViaje } from "../src/features/viajes/validations/viajes.ts";

const ahora = new Date("2030-01-10T15:30:20");

const base = {
  origen: "CENTRO",
  destino: "Universidad Popular Del Cesar",
  punto_encuentro: "Parque",
  precio_pasaje: 3500,
  cupos_disponibles: 2,
  fecha_salida: "2030-01-10",
  hora_salida: "15:30",
  informacion_adicional: "",
};

function validar(cambios = {}, opciones = {}) {
  return validarDatosNuevoViaje({ ...base, ...cambios }, "7", { ahora, ...opciones });
}

test("se puede publicar para hoy en la hora actual", () => {
  assert.equal(validar().valido, true);
});

test("la hora por defecto sigue siendo válida aunque el formulario lleve minutos abierto", () => {
  // Hora puesta a las 15:30 y enviada a las 15:42: antes se rechazaba como «pasado».
  const tarde = new Date("2030-01-10T15:42:50");
  assert.equal(validar({}, { ahora: tarde }).valido, true);
});

test("hoy es válido a cualquier hora del día, también una ya pasada", () => {
  assert.equal(validar({ hora_salida: "08:00" }).valido, true);
  assert.equal(validar({ hora_salida: "00:00" }).valido, true);
  assert.equal(validar({ hora_salida: "23:59" }).valido, true);
});

test("mañana y fechas futuras son válidas", () => {
  assert.equal(validar({ fecha_salida: "2030-01-11" }).valido, true);
  assert.equal(validar({ fecha_salida: "2030-02-01", hora_salida: "06:00" }).valido, true);
});

test("un día anterior a hoy se rechaza con un mensaje claro", () => {
  const resultado = validar({ fecha_salida: "2030-01-09", hora_salida: "23:59" });
  assert.equal(resultado.valido, false);
  assert.match(resultado.error, /anterior a hoy/);
});

test("el servidor da un día de margen por si está en otra zona horaria", () => {
  // Un servidor adelantado ve «hoy» un día después que el usuario.
  const servidorAdelantado = new Date("2030-01-11T01:00:00");
  assert.equal(
    validar({ fecha_salida: "2030-01-10", hora_salida: "20:00" }, { ahora: servidorAdelantado, toleranciaDias: 1 }).valido,
    true,
  );
  // Sin margen (navegador) esa misma fecha sí es un día pasado.
  assert.equal(
    validar({ fecha_salida: "2030-01-10", hora_salida: "20:00" }, { ahora: servidorAdelantado }).valido,
    false,
  );
  // Y dos días atrás se rechaza incluso con margen.
  assert.equal(
    validar({ fecha_salida: "2030-01-09" }, { ahora: servidorAdelantado, toleranciaDias: 1 }).valido,
    false,
  );
});

test("fecha u hora sin sentido se rechazan", () => {
  assert.equal(validar({ fecha_salida: "no-es-fecha" }).valido, false);
  assert.equal(validar({ hora_salida: "" }).valido, false);
  assert.equal(validar({ fecha_salida: "" }).valido, false);
});
