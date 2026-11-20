import assert from "node:assert/strict";
import { test } from "node:test";
import {
  validarFormularioRegistro,
  validarRegistroUsuario,
} from "../src/features/register/validations/usuarios.ts";

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
    telefono: "3001234567",
  };
}

for (const [telefono, esperado] of [
  ["3001234567", "+573001234567"],
  [" 300 123 4567 ", "+573001234567"],
  ["+57 300-123-4567", "+573001234567"],
  ["57 (300) 123.4567", "+573001234567"],
]) {
  test(`normaliza el celular ${JSON.stringify(telefono)}`, () => {
    const resultado = validarRegistroUsuario({ ...crearDatos("123"), telefono });

    assert.equal(resultado.valido, true);
    assert.equal(resultado.datos.telefono, esperado);
  });
}

for (const telefono of [
  "6055712345", // fijo de Valledupar: no recibe SMS
  "300123456",
  "30012345678",
  "+1 300 123 4567",
  "300123456a",
  "٣٠٠١٢٣٤٥٦٧", // dígitos arábigo-índicos
]) {
  test(`rechaza celular inválido: ${JSON.stringify(telefono)}`, () => {
    const resultado = validarRegistroUsuario({ ...crearDatos("123"), telefono });

    assert.equal(resultado.valido, false);
    assert.match(resultado.error, /celular/i);
  });
}

for (const telefono of [undefined, null, "", "   "]) {
  test(`el celular es obligatorio: ${JSON.stringify(telefono)}`, () => {
    assert.deepEqual(validarRegistroUsuario({ ...crearDatos("123"), telefono }), {
      valido: false,
      error: "Completa todos los campos.",
    });

    const datos = { ...crearDatos("123"), edad: "20", telefono };
    assert.deepEqual(validarFormularioRegistro(datos, datos.contrasena), {
      valido: false,
      error: "Por favor, completa todos los campos.",
    });
  });
}

test("acepta cédula numérica de hasta 10 dígitos y conserva ceros iniciales", () => {
  const resultado = validarRegistroUsuario(crearDatos("0123456789"));

  assert.equal(resultado.valido, true);
  assert.equal(resultado.datos.idUsuario, "0123456789");
});

test("no avanza al paso de correo si la cédula tiene más de 10 dígitos", () => {
  const datos = { ...crearDatos("12345678901"), edad: "20" };
  const resultado = validarFormularioRegistro(datos, datos.contrasena);

  assert.equal(resultado.valido, false);
  assert.match(resultado.error, /cédula/i);
});

for (const idUsuario of ["12A45", "12345678901"]) {
  test(`rechaza cédula inválida: ${JSON.stringify(idUsuario)}`, () => {
    const resultado = validarRegistroUsuario(crearDatos(idUsuario));

    assert.equal(resultado.valido, false);
    assert.match(resultado.error, /cédula/i);
  });
}
