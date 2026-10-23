// Endpoints para consultar y registrar el vehículo de un usuario.
import { NextResponse } from "next/server";
import type { PoolClient } from "pg";
import {
	validarIdUsuarioVehiculo,
	validarNuevoVehiculo,
} from "../../../src/features/ofrecer-viajes/validations/vehiculos";
import { getDbPool } from "../../../src/lib/db";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

/**
 * Obtiene el último vehículo registrado para el usuario autenticado.
 * @param request Solicitud con el identificador opcional de usuario en la query.
 * @returns Vehículo encontrado o respuesta de error.
 */
export async function GET(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	const idUsuario = new URL(request.url).searchParams.get("id_usuario");
	if (
		idUsuario !== null &&
		(!validarIdUsuarioVehiculo(idUsuario) || idUsuario.trim() !== sesion.id)
	) {
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

/**
 * Registra un vehículo y sus datos específicos dentro de una transacción.
 * @param request Solicitud con los datos del vehículo en JSON.
 * @returns Vehículo creado o respuesta de error.
 */
export async function POST(request: Request) {
	const sesion = await obtenerSesionActual();
	if (!sesion) {
		return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "El cuerpo de solicitud no es válido." },
			{ status: 400 },
		);
	}

	const validacion = validarNuevoVehiculo(body, sesion.id);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}
	const datos = validacion.datos;

	let client: PoolClient | null = null;
	try {
		client = await getDbPool().connect();
		await client.query("BEGIN");
		const result = await client.query(
			`INSERT INTO vehiculo (id_usuario, tipo, modelo, capacidad, ruta_cotidiana, foto_vehiculo)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id_vehiculo, id_usuario, tipo, modelo, capacidad, ruta_cotidiana, foto_vehiculo`,
			[
				datos.id_usuario,
				datos.tipo,
				datos.modelo,
				datos.capacidad,
				datos.ruta_cotidiana,
				datos.foto_vehiculo,
			],
		);
		const vehiculo = result.rows[0];

		if (datos.tipo === "Automovil") {
			await client.query(
				"INSERT INTO automovil (id_vehiculo, numero_puertas) VALUES ($1, $2)",
				[vehiculo.id_vehiculo, datos.numero_puertas],
			);
		} else if (datos.tipo === "Moto") {
			await client.query(
				"INSERT INTO moto (id_vehiculo, modalidad) VALUES ($1, $2)",
				[vehiculo.id_vehiculo, datos.modalidad],
			);
		}

		await client.query("COMMIT");
		return NextResponse.json({ vehiculo }, { status: 201 });
	} catch (error) {
		if (client) {
			try {
				await client.query("ROLLBACK");
			} catch (rollbackError) {
				console.error(
					"No se pudo revertir el registro del vehículo:",
					rollbackError,
				);
			}
		}
		console.error("Error al registrar vehículo:", error);
		const code =
			typeof error === "object" && error !== null && "code" in error
				? error.code
				: undefined;
		if (code === "23503") {
			return NextResponse.json(
				{ error: "El usuario indicado no existe." },
				{ status: 400 },
			);
		}
		if (code === "23514") {
			return NextResponse.json(
				{ error: "Los datos no cumplen las restricciones del vehículo." },
				{ status: 400 },
			);
		}
		return NextResponse.json(
			{ error: "No se pudo registrar el vehículo." },
			{ status: 500 },
		);
	} finally {
		client?.release();
	}
}
