// Endpoints de publicación y consulta de viajes.
import { NextResponse } from "next/server";
import {
  consultarViajes,
  publicarViaje,
} from "../../../src/features/viajes/services/viajesService";

export const runtime = "nodejs";

/**
 * Valida y publica un viaje.
 * @param request Solicitud con los datos del viaje en JSON.
 * @returns Viaje creado o respuesta de error.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la solicitud no es un JSON válido." },
      { status: 400 },
    );
  }

  try {
    const resultado = await publicarViaje(body);
    if (!resultado.valido) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado },
      );
    }

    return NextResponse.json({ viaje: resultado.viaje }, { status: 201 });
  } catch (error) {
    console.error("Error al registrar viaje en base de datos:", error);
    return NextResponse.json(
      { error: "No se pudo registrar el viaje en la base de datos." },
      { status: 500 },
    );
  }
}

/**
 * Consulta viajes activos o el viaje activo de un usuario.
 * @param request Solicitud con filtros de viaje en la query.
 * @returns Resultado de la consulta o respuesta de error.
 */
export async function GET(request: Request) {
  try {
    const resultado = await consultarViajes(new URL(request.url).searchParams);
    if (!resultado.valido) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.estado },
      );
    }

    return NextResponse.json(resultado.resultado);
  } catch (error) {
    console.error("Error al consultar viajes:", error);
    return NextResponse.json(
      { error: "No se pudieron obtener los viajes." },
      { status: 500 },
    );
  }
}
