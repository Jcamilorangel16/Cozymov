import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPair, SignJWT } from "jose";
import {
  construirUrlAutorizacionMicrosoft,
  obtenerConfigMicrosoft,
  verificarIdTokenMicrosoft,
} from "../src/lib/microsoft.ts";
import { crearParametrosOAuth } from "../src/lib/google.ts";

const TENANT = "11111111-2222-3333-4444-555555555555";
const OTRO_TENANT = "99999999-8888-7777-6666-555555555555";
const OID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const CLIENT_ID = "00000000-0000-0000-0000-00000000c11e";
const NONCE = "nonce-esperado";
const EMISOR = `https://login.microsoftonline.com/${TENANT}/v2.0`;
const CONFIG = { clientId: CLIENT_ID, tenantId: TENANT };

const { privateKey, publicKey } = await generateKeyPair("RS256");
const claves = async () => publicKey;

async function firmarToken({
  issuer = EMISOR,
  audience = CLIENT_ID,
  nonce = NONCE,
  expira = "5m",
  claims = { tid: TENANT, oid: OID, email: "Estudiante@Unicesar.edu.co" },
  clave = privateKey,
} = {}) {
  return new SignJWT({ nonce, ...claims })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("sub-pareado-por-app")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(clave);
}

function conEntorno(variables, fn) {
  const previas = {};
  for (const [nombre, valor] of Object.entries(variables)) {
    previas[nombre] = process.env[nombre];
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }
  try {
    return fn();
  } finally {
    for (const [nombre, valor] of Object.entries(previas)) {
      if (valor === undefined) delete process.env[nombre];
      else process.env[nombre] = valor;
    }
  }
}

const ENTORNO_COMPLETO = {
  MICROSOFT_CLIENT_ID: CLIENT_ID,
  MICROSOFT_CLIENT_SECRET: "secreto-de-prueba",
  MICROSOFT_TENANT_ID: TENANT.toUpperCase(),
  MICROSOFT_REDIRECT_URI: undefined,
};

test("obtenerConfigMicrosoft normaliza el tenant y arma el callback", () => {
  const config = conEntorno(ENTORNO_COMPLETO, () =>
    obtenerConfigMicrosoft("http://localhost:3000"),
  );
  assert.deepEqual(config, {
    clientId: CLIENT_ID,
    clientSecret: "secreto-de-prueba",
    tenantId: TENANT,
    redirectUri: "http://localhost:3000/api/auth/microsoft/callback",
  });
});

for (const tenant of ["common", "organizations", "consumers", "unicesar.edu.co", "", undefined]) {
  test(`obtenerConfigMicrosoft rechaza el tenant ${JSON.stringify(tenant)}`, () => {
    const config = conEntorno({ ...ENTORNO_COMPLETO, MICROSOFT_TENANT_ID: tenant }, () =>
      obtenerConfigMicrosoft("http://localhost:3000"),
    );
    assert.equal(config, null);
  });
}

test("obtenerConfigMicrosoft exige client id y secreto", () => {
  for (const faltante of ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"]) {
    const config = conEntorno({ ...ENTORNO_COMPLETO, [faltante]: undefined }, () =>
      obtenerConfigMicrosoft("http://localhost:3000"),
    );
    assert.equal(config, null, faltante);
  }
});

test("la URL de autorización apunta al tenant y usa PKCE y response_mode=query", () => {
  const parametros = crearParametrosOAuth();
  const url = new URL(
    construirUrlAutorizacionMicrosoft(
      { ...CONFIG, clientSecret: "x", redirectUri: "https://cozymov.com/api/auth/microsoft/callback" },
      parametros,
    ),
  );
  assert.equal(url.origin, "https://login.microsoftonline.com");
  assert.equal(url.pathname, `/${TENANT}/oauth2/v2.0/authorize`);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("response_mode"), "query");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("state"), parametros.state);
  assert.equal(url.searchParams.get("nonce"), parametros.nonce);
  assert.equal(url.searchParams.get("code_challenge"), parametros.challenge);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.has("client_secret"), false);
});

test("acepta un ID token válido del tenant y normaliza la identidad", async () => {
  const identidad = await verificarIdTokenMicrosoft(await firmarToken(), CONFIG, NONCE, claves);
  assert.deepEqual(identidad, {
    sub: `${TENANT}:${OID}`,
    correo: "estudiante@unicesar.edu.co",
    invitado: false,
    nombres: "",
    apellidos: "",
  });
});

test("devuelve given_name y family_name si Entra los envía", async () => {
  const token = await firmarToken({
    claims: { tid: TENANT, oid: OID, email: "a@unicesar.edu.co", given_name: " Ana María ", family_name: "Díaz" },
  });
  const identidad = await verificarIdTokenMicrosoft(token, CONFIG, NONCE, claves);
  assert.equal(identidad.nombres, "Ana María");
  assert.equal(identidad.apellidos, "Díaz");
});

test("usa preferred_username si el token no trae email", async () => {
  const token = await firmarToken({
    claims: { tid: TENANT, oid: OID, preferred_username: "Estudiante@unicesar.edu.co" },
  });
  const identidad = await verificarIdTokenMicrosoft(token, CONFIG, NONCE, claves);
  assert.equal(identidad.correo, "estudiante@unicesar.edu.co");
});

test("marca como invitada una cuenta autenticada por otro proveedor", async () => {
  for (const idp of ["https://sts.windows.net/99999999-8888-7777-6666-555555555555/", "live.com"]) {
    const token = await firmarToken({
      claims: { tid: TENANT, oid: OID, email: "alguien@unicesar.edu.co", idp },
    });
    const identidad = await verificarIdTokenMicrosoft(token, CONFIG, NONCE, claves);
    assert.equal(identidad.invitado, true, idp);
  }
});

test("un idp igual al tenant no marca la cuenta como invitada", async () => {
  const token = await firmarToken({
    claims: { tid: TENANT, oid: OID, email: "a@unicesar.edu.co", idp: `https://sts.windows.net/${TENANT}/` },
  });
  const identidad = await verificarIdTokenMicrosoft(token, CONFIG, NONCE, claves);
  assert.equal(identidad.invitado, false);
});

const RECHAZOS = {
  "otro emisor": { issuer: `https://login.microsoftonline.com/${OTRO_TENANT}/v2.0` },
  "emisor v1": { issuer: `https://sts.windows.net/${TENANT}/` },
  "otra audiencia": { audience: "otra-aplicacion" },
  "nonce distinto": { nonce: "otro-nonce" },
  "token vencido": { expira: Math.floor(Date.now() / 1000) - 600 },
  "tid de otro tenant": { claims: { tid: OTRO_TENANT, oid: OID, email: "a@unicesar.edu.co" } },
  "sin tid": { claims: { oid: OID, email: "a@unicesar.edu.co" } },
  "sin oid": { claims: { tid: TENANT, email: "a@unicesar.edu.co" } },
  "sin correo": { claims: { tid: TENANT, oid: OID } },
};

for (const [caso, opciones] of Object.entries(RECHAZOS)) {
  test(`rechaza un ID token: ${caso}`, async () => {
    await assert.rejects(
      verificarIdTokenMicrosoft(await firmarToken(opciones), CONFIG, NONCE, claves),
    );
  });
}

test("rechaza un ID token firmado con otra clave", async () => {
  const { privateKey: otraClave } = await generateKeyPair("RS256");
  await assert.rejects(
    verificarIdTokenMicrosoft(await firmarToken({ clave: otraClave }), CONFIG, NONCE, claves),
  );
});
