import assert from "node:assert/strict";
import { test } from "node:test";
import { distanciaMetros, indicePuntoCercano } from "../src/lib/mapa.ts";

test("distanciaMetros calcula distancias cortas en Valledupar", () => {
  assert.equal(distanciaMetros([10.46, -73.25], [10.46, -73.25]), 0);
  const d = distanciaMetros([10.46, -73.25], [10.47, -73.25]);
  assert.ok(d > 1100 && d < 1120);
});

test("indicePuntoCercano elige el punto más próximo del trayecto", () => {
  const trayecto = [[10.46, -73.25], [10.47, -73.25], [10.48, -73.25]];
  assert.equal(indicePuntoCercano(trayecto, [10.4801, -73.25]), 2);
  assert.equal(indicePuntoCercano([], [10, -73]), -1);
});

test("decodificarPolilinea y slugBarrio", async () => {
  const { decodificarPolilinea, slugBarrio } = await import("../src/lib/mapa.ts");
  assert.deepEqual(decodificarPolilinea("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [
    [38.5, -120.2], [40.7, -120.95], [43.252, -126.453],
  ]);
  assert.equal(slugBarrio("SANTO  DOMINGO"), "santo-domingo");
  assert.equal(slugBarrio("DOÑA CLARA"), "dona-clara");
});
