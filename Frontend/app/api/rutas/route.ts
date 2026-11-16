import { NextResponse } from "next/server";
import {
	contextoAutenticado,
	esRespuesta,
	llamarBackend,
	reenviarRespuesta,
} from "../../../src/lib/proxyUsuario";

export const runtime = "nodejs";

export async function GET() {
	const ctx = await contextoAutenticado();
	if (esRespuesta(ctx)) return ctx;

	const respuesta = await llamarBackend(ctx, "/api/rutas");
	return respuesta instanceof NextResponse ? respuesta : reenviarRespuesta(respuesta);
}
