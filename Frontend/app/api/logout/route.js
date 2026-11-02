// Cierra la sesión eliminando la cookie.
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { NOMBRE_COOKIE_SESION } from '../../../src/lib/auth';

export async function POST() {
  (await cookies()).delete(NOMBRE_COOKIE_SESION);
  return NextResponse.json({ ok: true });
}