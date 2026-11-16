import assert from "node:assert/strict";
import { test } from "node:test";
import { validarRegistroUsuario } from "../src/features/register/validations/usuarios.ts";

function crearDatos(idUsuario) {
  return {
    idUsuario,
    primerNombre: "Ana",
    segundoNombre: null,
    primerApellido: "Prueba",
    segundoApellido: null,
    edad: 20,
    correo: "ana@example.edu.co",
    contrasena: "contrasena-segura",
    ocupacion: "estudiante",
  };
}

test("acepta cédula numérica de hasta 10 dígitos y conserva ceros iniciales", () => {
  const resultado = validarRegistroUsuario(crearDatos("0123456789"));

  assert.equal(resultado.valido, true);
  assert.equal(resultado.datos.idUsuario, "0123456789");
});

for (const idUsuario of ["12A45", "12345678901"]) {
  test(`rechaza cédula inválida: ${JSON.stringify(idUsuario)}`, () => {
    const resultado = validarRegistroUsuario(crearDatos(idUsuario));

    assert.equal(resultado.valido, false);
    assert.match(resultado.error, /cédula/i);
  });
}
