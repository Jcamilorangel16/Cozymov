import assert from "node:assert/strict";
import { test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(especificador, contexto, siguiente) {
    try {
      return siguiente(especificador, contexto);
    } catch (error) {
      if (error?.code !== "ERR_MODULE_NOT_FOUND" || !especificador.startsWith(".")) throw error;
      for (const ext of [".ts", ".js"]) {
        try {
          return siguiente(especificador + ext, contexto);
        } catch {
          // prueba la siguiente extensión
        }
      }
      throw error;
    }
  },
});

const { MAX_TAMANO_ARCHIVO_BYTES } = await import("../src/features/ofrecer-viajes/constants/vehiculos.ts");
const { validarArchivoVehiculo } = await import("../src/features/ofrecer-viajes/validations/vehiculos.ts");

const archivo = (type, size = 1024) => ({ type, size });

test("acepta imágenes y PDF dentro del límite de 5 MB", () => {
  assert.equal(validarArchivoVehiculo(archivo("image/jpeg"), "imagen"), null);
  assert.equal(validarArchivoVehiculo(archivo("application/pdf", MAX_TAMANO_ARCHIVO_BYTES), "pdf"), null);
});

test("rechaza un tipo de archivo que no corresponde al campo", () => {
  assert.equal(
    validarArchivoVehiculo(archivo("application/pdf"), "imagen"),
    "Selecciona un archivo de imagen.",
  );
  assert.equal(
    validarArchivoVehiculo(archivo("image/png"), "pdf"),
    "Selecciona un archivo PDF.",
  );
});

test("rechaza archivos que superan 5 MB", () => {
  assert.equal(
    validarArchivoVehiculo(archivo("image/png", MAX_TAMANO_ARCHIVO_BYTES + 1), "imagen"),
    "El archivo no debe superar 5 MB.",
  );
});
