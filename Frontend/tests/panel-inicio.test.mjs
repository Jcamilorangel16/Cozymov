import assert from "node:assert/strict";
import { test } from "node:test";
import {
  combinarFechaHora,
  construirCatalogoDestinos,
  descripcionVehiculo,
  etiquetaCalificacion,
  filtrarSugerencias,
  rutasCompatibles,
  validarSolicitud,
} from "../src/features/menu-principal/utils/destinosInicio.js";

const barrios = ["LA NEVADA", "CENTRO", "SANTO  DOMINGO", "Sicarare"];
const rutas = [
  { idRuta: 1, origen: "Centro", destino: "La Nevada" },
  { idRuta: 2, origen: "Kenedy", destino: "LA NEVADA" },
  { idRuta: 3, origen: "Centro", destino: "Garupal" },
];

test("el catálogo deduplica ignorando mayúsculas y acentos", () => {
  const catalogo = construirCatalogoDestinos([...barrios, "la nevada", "La Névada"], rutas);
  assert.equal(catalogo.filter((d) => /la n[eé]vada/i.test(d)).length, 1);
  assert.ok(catalogo.includes("Garupal"));
  assert.ok(catalogo.includes("SANTO DOMINGO"));
});

test("autocompletado: filtra sin acentos y prioriza el inicio", () => {
  const catalogo = construirCatalogoDestinos(barrios, rutas);
  assert.deepEqual(filtrarSugerencias(catalogo, "nev"), ["LA NEVADA"]);
  assert.ok(filtrarSugerencias(catalogo, "LA NÉV").includes("LA NEVADA"));
  assert.deepEqual(filtrarSugerencias(catalogo, "  "), []);
  assert.deepEqual(filtrarSugerencias(catalogo, "zzz"), []);
  const [primero] = filtrarSugerencias(["Barrio Centro", "Centro"], "cen");
  assert.equal(primero, "Centro");
});

test("rutas compatibles: 0, 1 o varias, sin inventar", () => {
  assert.equal(rutasCompatibles(rutas, "Garupal").length, 1);
  assert.equal(rutasCompatibles(rutas, "la nevada").length, 2);
  assert.deepEqual(rutasCompatibles(rutas, "Sicarare"), []);
  assert.deepEqual(rutasCompatibles(null, "Centro"), []);
});

test("combina fecha y hora para /api/solicitudes", () => {
  assert.equal(combinarFechaHora("2030-01-02", "08:30"), "2030-01-02T08:30:00");
  assert.equal(combinarFechaHora("", "08:30"), "");
});

test("valida la solicitud, incluida la ruta faltante", () => {
  const ahora = new Date("2030-01-01T00:00:00");
  const base = { precio: "5000", fecha: "2030-01-02", hora: "08:30", idRuta: "1" };
  assert.equal(validarSolicitud(base, ahora), "");
  assert.match(validarSolicitud({ ...base, precio: "" }, ahora), /precio/);
  assert.match(validarSolicitud({ ...base, precio: "0" }, ahora), /precio/);
  assert.match(validarSolicitud({ ...base, hora: "" }, ahora), /fecha y la hora/);
  assert.match(validarSolicitud({ ...base, fecha: "2029-12-31" }, ahora), /futuras/);
  assert.match(validarSolicitud({ ...base, idRuta: "" }, ahora), /ruta compatible/);
});

test("calificación real, sin valores ficticios", () => {
  assert.equal(etiquetaCalificacion({ estado: "listo", promedio: 4.5, total: 3 }), "★ 4.5 (3)");
  assert.equal(etiquetaCalificacion({ estado: "listo", promedio: null, total: 0 }), "Sin calificaciones");
  assert.equal(etiquetaCalificacion({ estado: "error" }), "Calificación no disponible");
});

test("descripción de vehículo con datos faltantes", () => {
  assert.equal(descripcionVehiculo({ tipo_vehiculo: "Automóvil", modelo_vehiculo: "2020" }), "Automóvil · 2020");
  assert.equal(descripcionVehiculo({}), "Vehículo no especificado");
});
