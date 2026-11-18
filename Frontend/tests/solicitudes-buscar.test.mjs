// Pruebas de las solicitudes de pasajeros en «Buscar» y de los avisos a conductores.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectarSolicitudesNuevas,
  filtrarSolicitudes,
  textoAvisoSolicitudes,
} from "../src/features/buscar-viajes/utils/solicitudes.js";

const solicitudes = [
  { idSolicitud: 1, origen: "CENTRO", destino: "Universidad Popular Del Cesar", fechaHora: "2030-01-02T08:30:00", nombreUsuario: "Ana Pérez" },
  { idSolicitud: 2, origen: "LOS ALAMOS", destino: "CENTRO", fechaHora: "2030-01-03T07:00:00", nombreUsuario: "Luis Gómez" },
  { idSolicitud: 3, origen: "SAN FRANCISCO", destino: "Universidad Popular Del Cesar", fechaHora: "2030-01-02T18:00:00", nombreUsuario: "Eva Ruiz" },
];

test("sin filtros se muestran todas las solicitudes", () => {
  assert.equal(filtrarSolicitudes(solicitudes, {}).length, 3);
  assert.equal(filtrarSolicitudes(solicitudes).length, 3);
});

test("el filtro de origen y destino ignora acentos y mayúsculas", () => {
  assert.deepEqual(
    filtrarSolicitudes(solicitudes, { destino: "universidad" }).map((s) => s.idSolicitud),
    [1, 3],
  );
  assert.deepEqual(
    filtrarSolicitudes(solicitudes, { origen: "álamos" }).map((s) => s.idSolicitud),
    [2],
  );
  assert.equal(filtrarSolicitudes(solicitudes, { origen: "no existe" }).length, 0);
});

test("el filtro de fecha compara el día de la solicitud y se combina con los demás", () => {
  assert.deepEqual(
    filtrarSolicitudes(solicitudes, { fecha: "2030-01-02" }).map((s) => s.idSolicitud),
    [1, 3],
  );
  assert.deepEqual(
    filtrarSolicitudes(solicitudes, { fecha: "2030-01-02", origen: "centro" }).map((s) => s.idSolicitud),
    [1],
  );
});

test("la primera consulta solo memoriza: no avisa de solicitudes anteriores", () => {
  const { nuevas, vistas } = detectarSolicitudesNuevas(solicitudes, null);
  assert.deepEqual(nuevas, []);
  assert.deepEqual(vistas, [1, 2, 3]);
});

test("solo avisa de las solicitudes que el conductor no conocía", () => {
  const { nuevas, vistas } = detectarSolicitudesNuevas(solicitudes, [1, 2]);
  assert.deepEqual(nuevas.map((s) => s.idSolicitud), [3]);
  assert.deepEqual(vistas, [1, 2, 3]);
});

test("no repite el aviso y olvida las solicitudes que ya no están pendientes", () => {
  assert.deepEqual(detectarSolicitudesNuevas(solicitudes, [1, 2, 3]).nuevas, []);
  const { nuevas, vistas } = detectarSolicitudesNuevas([solicitudes[2]], [1, 2, 3]);
  assert.deepEqual(nuevas, []);
  assert.deepEqual(vistas, [3]);
});

test("el aviso describe una solicitud o resume varias", () => {
  const una = textoAvisoSolicitudes([solicitudes[0]]);
  assert.equal(una.titulo, "Nueva solicitud de viaje");
  assert.equal(una.texto, "Ana Pérez: CENTRO → Universidad Popular Del Cesar");

  const varias = textoAvisoSolicitudes(solicitudes);
  assert.match(varias.titulo, /^3 solicitudes nuevas/);
  assert.match(varias.texto, /Buscar/);
});
