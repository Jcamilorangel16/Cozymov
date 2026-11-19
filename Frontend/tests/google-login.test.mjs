import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  construirUrlAutorizacion,
  crearParametrosOAuth,
  origenPublico,
  verificarIdTokenGoogle,
} from "../src/lib/google.ts";

test("origenPublico usa el dominio del callback configurado", () => {
  const config = {
    clientId: "id",
    clientSecret: "secreto",
    redirectUri: "https://cozymov.com/api/auth/google/callback",
  };
  assert.equal(origenPublico("http://localhost:3000", config), "https://cozymov.com");
  assert.equal(origenPublico("http://localhost:3000", null), "http://localhost:3000");
  assert.equal(
    origenPublico("http://localhost:3000", { ...config, redirectUri: "no es url" }),
    "http://localhost:3000",
  );
});

const CLIENT_ID = "cliente-de-prueba.apps.googleusercontent.com";
const NONCE = "nonce-esperado";

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), alg: "RS256", use: "sig" };
const claves = async () => publicKey;

async function firmarToken({
  issuer = "https://accounts.google.com",
  audience = CLIENT_ID,
  nonce = NONCE,
  expira = "5m",
  extra = {},
} = {}) {
  return new SignJWT({
    email: "Persona@Universidad.edu.co",
    email_verified: true,
    nonce,
    ...extra,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("sub-estable-123")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expira)
    .sign(privateKey);
}

test("acepta un ID token válido y normaliza el correo", async () => {
  const identidad = await verificarIdTokenGoogle(
    await firmarToken(),
    CLIENT_ID,
    NONCE,
    claves,
  );
  assert.deepEqual(identidad, {
    sub: "sub-estable-123",
    correo: "persona@universidad.edu.co",
    emailVerificado: true,
  });
  assert.equal(jwk.kty, "RSA");
});

test("rechaza audiencia incorrecta", async () => {
  await assert.rejects(
    verificarIdTokenGoogle(
      await firmarToken({ audience: "otro-cliente" }),
      CLIENT_ID,
      NONCE,
      claves,
    ),
  );
});

test("rechaza emisor incorrecto", async () => {
  await assert.rejects(
    verificarIdTokenGoogle(
      await firmarToken({ issuer: "https://emisor-falso.example" }),
      CLIENT_ID,
      NONCE,
      claves,
    ),
  );
});

test("rechaza token expirado", async () => {
  await assert.rejects(
    verificarIdTokenGoogle(
      await firmarToken({ expira: Math.floor(Date.now() / 1000) - 60 }),
      CLIENT_ID,
      NONCE,
      claves,
    ),
  );
});

test("rechaza nonce distinto", async () => {
  await assert.rejects(
    verificarIdTokenGoogle(
      await firmarToken({ nonce: "otro" }),
      CLIENT_ID,
      NONCE,
      claves,
    ),
    /nonce/i,
  );
});

test("rechaza token firmado con otra clave", async () => {
  const otra = await generateKeyPair("RS256");
  const token = await new SignJWT({ email: "a@b.edu.co", email_verified: true, nonce: NONCE })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("x")
    .setIssuer("https://accounts.google.com")
    .setAudience(CLIENT_ID)
    .setExpirationTime("5m")
    .sign(otra.privateKey);
  await assert.rejects(verificarIdTokenGoogle(token, CLIENT_ID, NONCE, claves));
});

test("informa correo no verificado y exige sub y correo", async () => {
  const noVerificado = await verificarIdTokenGoogle(
    await firmarToken({ extra: { email_verified: false } }),
    CLIENT_ID,
    NONCE,
    claves,
  );
  assert.equal(noVerificado.emailVerificado, false);

  await assert.rejects(
    verificarIdTokenGoogle(
      await firmarToken({ extra: { email: undefined } }),
      CLIENT_ID,
      NONCE,
      claves,
    ),
    /correo/i,
  );
});

test("la URL de autorización usa PKCE S256, state y nonce sin exponer el secreto", () => {
  const parametros = crearParametrosOAuth();
  const url = new URL(
    construirUrlAutorizacion(
      {
        clientId: CLIENT_ID,
        clientSecret: "secreto-que-no-debe-aparecer",
        redirectUri: "https://app.example/api/auth/google/callback",
      },
      parametros,
    ),
  );

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email");
  assert.equal(url.searchParams.get("state"), parametros.state);
  assert.equal(url.searchParams.get("nonce"), parametros.nonce);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    url.searchParams.get("code_challenge"),
    createHash("sha256").update(parametros.verifier).digest("base64url"),
  );
  assert.ok(!url.toString().includes("secreto-que-no-debe-aparecer"));
  assert.ok(!url.toString().includes(parametros.verifier));
});
