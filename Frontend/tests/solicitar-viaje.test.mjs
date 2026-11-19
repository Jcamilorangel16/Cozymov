// Pruebas del flujo «solicitar un viaje»: validación del formulario, barrio sugerido
// por el GPS y elegibilidad del conductor para aceptar una solicitud.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PRESUPUESTO_PREDETERMINADO,
  construirCatalogoDestinos,
  fechaLocalISO,
  filtrarSugerencias,
  horaLocalHHmm,
  validarSolicitudViaje,
} from "../src/features/menu-principal/utils/destinosInicio.js";
import {
  esModoColaboracion,
  formatearPresupuestoSolicitud,
  formatearPrecioViaje,
} from "../src/features/buscar-viajes/utils/viajes.js";
import {
  UNIVERSIDAD_COORDENADA,
  barrioMasCercano,
  coordenadaDeBarrio,
} from "../src/lib/mapa.ts";
import {
  motivoNoAceptarSolicitud,
  puedeAceptarSolicitud,
} from "../src/features/viajes/validations/viajes.ts";

const ahora = new Date("2030-01-01T07:00:00");
const base = {
  origen: "LA NEVADA",
  destino: "CENTRO",
  precio: String(PRESUPUESTO_PREDETERMINADO),
  fecha: "2030-01-02",
  hora: "08:30",
};

test("el presupuesto propuesto por defecto es 3500 COP", () => {
  assert.equal(PRESUPUESTO_PREDETERMINADO, 3500);
});

test("la solicitud válida no devuelve mensaje de error", () => {
  assert.equal(validarSolicitudViaje(base, ahora), "");
});

test("origen y destino son obligatorios y deben ser distintos", () => {
  assert.match(validarSolicitudViaje({ ...base, origen: "" }, ahora), /sales/);
  assert.match(validarSolicitudViaje({ ...base, destino: "  " }, ahora), /llegar/);
  assert.match(
    validarSolicitudViaje({ ...base, destino: "la nevada" }, ahora),
    /diferentes/,
  );
  // Ignora acentos y espacios repetidos al comparar los barrios.
  assert.match(
    validarSolicitudViaje({ origen: "SANTO  DOMINGO", destino: "Santo Domíngo", precio: "3500", fecha: "2030-01-02", hora: "08:30" }, ahora),
    /diferentes/,
  );
});

test("modo colaboración: una solicitud con precio 0 es válida", () => {
  assert.equal(validarSolicitudViaje({ ...base, precio: "0" }, ahora), "");
  assert.equal(validarSolicitudViaje({ ...base, precio: 0 }, ahora), "");
});

test("el precio debe ser un número no negativo y razonable", () => {
  assert.match(validarSolicitudViaje({ ...base, precio: "" }, ahora), /precio/);
  assert.match(validarSolicitudViaje({ ...base, precio: "-100" }, ahora), /precio/);
  assert.match(validarSolicitudViaje({ ...base, precio: "abc" }, ahora), /precio/);
  assert.match(validarSolicitudViaje({ ...base, precio: "100000000" }, ahora), /alto/);
  assert.equal(validarSolicitudViaje({ ...base, precio: 4200 }, ahora), "");
});

test("la fecha y la hora son obligatorias y no puede ser un día anterior a hoy", () => {
  assert.match(validarSolicitudViaje({ ...base, hora: "" }, ahora), /fecha y la hora/);
  assert.match(validarSolicitudViaje({ ...base, fecha: "" }, ahora), /fecha y la hora/);
  assert.match(
    validarSolicitudViaje({ ...base, fecha: "2029-12-31" }, ahora),
    /anterior a hoy/,
  );
  // Hoy es válido a cualquier hora, incluso una ya pasada del día.
  assert.equal(
    validarSolicitudViaje({ ...base, fecha: "2030-01-01", hora: "06:59" }, ahora),
    "",
  );
  assert.equal(
    validarSolicitudViaje({ ...base, fecha: "2030-01-01", hora: "00:00" }, ahora),
    "",
  );
});

test("la hora por defecto sigue siendo válida aunque el formulario lleve varios minutos abierto", () => {
  const alAbrir = new Date("2030-01-01T07:00:10");
  const porDefecto = { ...base, fecha: fechaLocalISO(alAbrir), hora: horaLocalHHmm(alAbrir) };
  const alEnviar = new Date("2030-01-01T07:12:40");
  assert.equal(validarSolicitudViaje(porDefecto, alEnviar), "");
});

test("la fecha y la hora actuales (valores por defecto) son válidas aunque pasen segundos", () => {
  const conSegundos = new Date("2030-01-01T07:00:45");
  const porDefecto = {
    ...base,
    fecha: fechaLocalISO(conSegundos),
    hora: horaLocalHHmm(conSegundos),
  };
  assert.equal(porDefecto.hora, "07:00");
  assert.equal(validarSolicitudViaje(porDefecto, conSegundos), "");
});

test("horaLocalHHmm rellena con ceros la hora local", () => {
  assert.equal(horaLocalHHmm(new Date("2030-05-04T09:05:59")), "09:05");
  assert.equal(horaLocalHHmm(new Date("2030-05-04T23:41:00")), "23:41");
});

test("la Universidad Popular del Cesar está en el catálogo de destinos de Inicio", () => {
  const catalogoDestinos = construirCatalogoDestinos(["CENTRO"], []);
  assert.ok(catalogoDestinos.includes("Universidad Popular Del Cesar"));
  assert.deepEqual(filtrarSugerencias(catalogoDestinos, "universidad"), [
    "Universidad Popular Del Cesar",
  ]);
  // No se duplica si una ruta persistida ya la tiene como destino.
  const conRuta = construirCatalogoDestinos([], [{ destino: "UNIVERSIDAD POPULAR DEL CESAR" }]);
  assert.equal(conRuta.length, 1);
});

test("la universidad tiene coordenadas aunque no esté en el archivo de barrios", () => {
  assert.deepEqual(coordenadaDeBarrio("Universidad Popular Del Cesar", {}), UNIVERSIDAD_COORDENADA);
  assert.deepEqual(coordenadaDeBarrio("universidad popular del cesar", catalogo), UNIVERSIDAD_COORDENADA);
});

test("fechaLocalISO entrega la fecha local en formato YYYY-MM-DD", () => {
  assert.match(fechaLocalISO(new Date("2030-05-04T10:00:00")), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(fechaLocalISO(new Date("2030-05-04T10:00:00")), "2030-05-04");
});

const catalogo = {
  "LA NEVADA": [10.4501, -73.2601],
  CENTRO: [10.4759, -73.2470],
  "SANTO  DOMINGO": [10.4765, -73.2471],
};

test("barrioMasCercano elige el barrio más próximo dentro del radio", () => {
  assert.equal(barrioMasCercano([10.4502, -73.2602], catalogo), "LA NEVADA");
  assert.equal(barrioMasCercano([10.4758, -73.2469], catalogo), "CENTRO");
});

test("barrioMasCercano no sugiere nada si la ubicación está lejos", () => {
  // Santa Marta: fuera de Valledupar.
  assert.equal(barrioMasCercano([11.2404, -74.199], catalogo), null);
  assert.equal(barrioMasCercano([10.45, -73.26], {}), null);
});

test("coordenadaDeBarrio compara sin acentos ni mayúsculas", () => {
  assert.deepEqual(coordenadaDeBarrio("la nevada", catalogo), [10.4501, -73.2601]);
  assert.deepEqual(coordenadaDeBarrio("Santo Domingo", catalogo), [10.4765, -73.2471]);
  assert.equal(coordenadaDeBarrio("BARRIO QUE NO EXISTE", catalogo), null);
  assert.equal(coordenadaDeBarrio("", catalogo), null);
});

test("solo un conductor con vehículo y sin viaje en curso acepta solicitudes", () => {
  assert.equal(puedeAceptarSolicitud("7", true, false), true);
  assert.equal(puedeAceptarSolicitud("", true, false), false);
  assert.equal(puedeAceptarSolicitud("7", false, false), false);
  assert.equal(puedeAceptarSolicitud("7", null, false), false);
  assert.equal(puedeAceptarSolicitud("7", true, true), false);
});

test("el motivo explica por qué no se puede aceptar la solicitud", () => {
  assert.equal(motivoNoAceptarSolicitud("7", true, false), null);
  assert.match(motivoNoAceptarSolicitud("", true, false), /sesión/);
  assert.match(motivoNoAceptarSolicitud("7", true, true), /en curso/);
  assert.match(motivoNoAceptarSolicitud("7", false, false), /vehículo/);
  assert.match(motivoNoAceptarSolicitud("7", null, false), /comprobar/);
});

test("modo colaboración: 0 pesos se muestra como «Modo colaboración» y null como sin presupuesto", () => {
  assert.equal(esModoColaboracion(0), true);
  assert.equal(esModoColaboracion("0"), true);
  assert.equal(esModoColaboracion(""), false);
  assert.equal(esModoColaboracion(null), false);
  assert.equal(esModoColaboracion(3500), false);
  assert.equal(formatearPrecioViaje(0), "Modo colaboración");
  assert.equal(formatearPresupuestoSolicitud(0), "Modo colaboración");
  assert.equal(formatearPresupuestoSolicitud(null), "Sin presupuesto");
  assert.equal(formatearPresupuestoSolicitud(undefined, "Sin límite"), "Sin límite");
  assert.match(formatearPresupuestoSolicitud(3500), /3\.500/);
});
