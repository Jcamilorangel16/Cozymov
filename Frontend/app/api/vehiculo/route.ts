import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import { getDbPool } from "../../../src/lib/db";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

const tiposVehiculo = ["Automovil", "Moto", "Bicicleta electrica"] as const;

function esRegistro(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const idUsuario = new URL(request.url).searchParams.get("id_usuario");
	if (idUsuario !== null && idUsuario.trim() !== sesion.id) {
		return NextResponse.json(
			{ error: "No puedes consultar el vehículo de otro usuario." },
			{ status: 403 },
		);
	}

	try {
		const result = await getDbPool().query(
			`SELECT v.id_vehiculo, v.id_usuario, v.tipo, v.modelo, v.capacidad,
			        v.ruta_cotidiana, v.foto_vehiculo,
			        a.numero_puertas, m.modalidad
			 FROM vehiculo v
			 LEFT JOIN automovil a ON a.id_vehiculo = v.id_vehiculo
			 LEFT JOIN moto m ON m.id_vehiculo = v.id_vehiculo
			 WHERE v.id_usuario = $1
			 ORDER BY v.id_vehiculo DESC
			 LIMIT 1`,
			[sesion.id],
		);

		return NextResponse.json({ vehiculo: result.rows[0] ?? null });
	} catch (error) {
		console.error("Error al consultar vehículo:", error);
		return NextResponse.json(
			{ error: "No se pudo consultar el vehículo." },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "El cuerpo de solicitud no es válido." }, { status: 400 });
	}

	if (!esRegistro(body)) {
		return NextResponse.json({ error: "Cuerpo de solicitud inválido." }, { status: 400 });
	}

	const {
		tipo,
		modelo,
		capacidad,
		ruta_cotidiana,
		foto_vehiculo,
		numero_puertas,
		modalidad,
	} = body;
	if (typeof tipo !== "string" || !tiposVehiculo.includes(tipo as (typeof tiposVehiculo)[number])) {
		return NextResponse.json({ error: "El tipo de vehículo no es válido." }, { status: 400 });
	}
	if (typeof modelo !== "string" || !modelo.trim() || modelo.length > 50) {
		return NextResponse.json({ error: "modelo es obligatorio y debe tener máximo 50 caracteres." }, { status: 400 });
	}
	if (typeof capacidad !== "number" || !Number.isInteger(capacidad) || capacidad <= 0 || capacidad > 32767) {
		return NextResponse.json({ error: "capacidad debe ser un entero positivo (máximo 32767)." }, { status: 400 });
	}
	if (ruta_cotidiana != null && (typeof ruta_cotidiana !== "string" || ruta_cotidiana.length > 255)) {
		return NextResponse.json({ error: "ruta_cotidiana debe tener máximo 255 caracteres." }, { status: 400 });
	}
	if (foto_vehiculo != null && (typeof foto_vehiculo !== "string" || foto_vehiculo.length > 255)) {
		return NextResponse.json({ error: "foto_vehiculo debe tener máximo 255 caracteres." }, { status: 400 });
	}
	if (
		tipo === "Automovil" &&
		(typeof numero_puertas !== "number" ||
			![2, 3, 4, 5].includes(numero_puertas))
	) {
		return NextResponse.json({ error: "El número de puertas no es válido." }, { status: 400 });
	}
	if (
		tipo === "Moto" &&
		(typeof modalidad !== "string" || !modalidad.trim() || modalidad.length > 20)
	) {
		return NextResponse.json({ error: "La modalidad de la moto es obligatoria." }, { status: 400 });
	}

	let client: PoolClient | null = null;
	try {
		client = await getDbPool().connect();
		await client.query("BEGIN");
		const result = await client.query(
			`INSERT INTO vehiculo (id_usuario, tipo, modelo, capacidad, ruta_cotidiana, foto_vehiculo)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id_vehiculo, id_usuario, tipo, modelo, capacidad, ruta_cotidiana, foto_vehiculo`,
			[
				sesion.id,
				tipo,
				modelo.trim(),
				capacidad,
				ruta_cotidiana || null,
				foto_vehiculo ?? null,
			],
		);
		const vehiculo = result.rows[0];

		if (tipo === "Automovil") {
			await client.query(
				"INSERT INTO automovil (id_vehiculo, numero_puertas) VALUES ($1, $2)",
				[vehiculo.id_vehiculo, numero_puertas],
			);
		} else if (tipo === "Moto") {
			await client.query(
				"INSERT INTO moto (id_vehiculo, modalidad) VALUES ($1, $2)",
				[vehiculo.id_vehiculo, modalidad],
			);
		}

		await client.query("COMMIT");
		return NextResponse.json({ vehiculo }, { status: 201 });
	} catch (error) {
		if (client) {
			try {
				await client.query("ROLLBACK");
			} catch (rollbackError) {
				console.error("No se pudo revertir el registro del vehículo:", rollbackError);
			}
		}
		console.error("Error al registrar vehículo:", error);
		const code =
			typeof error === "object" && error !== null && "code" in error
				? error.code
				: undefined;
		if (code === "23503") return NextResponse.json({ error: "El usuario indicado no existe." }, { status: 400 });
		if (code === "23514") return NextResponse.json({ error: "Los datos no cumplen las restricciones del vehículo." }, { status: 400 });
		return NextResponse.json({ error: "No se pudo registrar el vehículo." }, { status: 500 });
	} finally {
		client?.release();
	}
}
