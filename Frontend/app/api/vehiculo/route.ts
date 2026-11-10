// Proxy autenticado para consultar y registrar vehículos en el backend.
import { NextResponse } from "next/server";
import {
	validarIdUsuarioVehiculo,
	validarNuevoVehiculo,
} from "../../../src/features/ofrecer-viajes/validations/vehiculos";
import type { DatosNuevoVehiculo } from "../../../src/features/ofrecer-viajes/types/vehiculos";
import { getDbPool } from "../../../src/lib/db";
import { obtenerSesionActual } from "../../../src/lib/auth";

export const runtime = "nodejs";

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function obtenerCampo(registro: Registro, ...nombres: string[]): unknown {
	for (const nombre of nombres) {
		if (registro[nombre] !== undefined) {
			return registro[nombre];
		}
	}
	return undefined;
}

function obtenerBaseApi(): string | null {
	const apiUrl = process.env.VITE_API_URL;
	return apiUrl ? apiUrl.replace(/\/+$/, "") : null;
}

async function responderErrorApi(respuesta: Response, mensaje: string) {
	const detalle = await respuesta.text();
	let error = detalle || mensaje;
	try {
		const resultado: unknown = JSON.parse(detalle);
		if (esRegistro(resultado)) {
			const detalleApi = obtenerCampo(resultado, "error", "detail", "title");
			if (typeof detalleApi === "string" && detalleApi) {
				error = detalleApi;
			}
		}
	} catch {
		// El backend puede responder texto plano.
	}
	return NextResponse.json({ error }, { status: respuesta.status });
}

function normalizarVehiculo(valor: unknown): Registro | null {
	if (!esRegistro(valor)) {
		return null;
	}
	const automovil = obtenerCampo(valor, "automovil", "Automovil");
	const moto = obtenerCampo(valor, "moto", "Moto");
	const puertas = esRegistro(automovil)
		? obtenerCampo(automovil, "numeroPuertas", "NumeroPuertas", "numero_puertas")
		: undefined;
	const modalidad = esRegistro(moto)
		? obtenerCampo(moto, "modalidad", "Modalidad")
		: undefined;

	return {
		id_vehiculo: obtenerCampo(valor, "idVehiculo", "IdVehiculo", "id_vehiculo"),
		id_usuario: String(obtenerCampo(valor, "idUsuario", "IdUsuario", "id_usuario") ?? ""),
		tipo: obtenerCampo(valor, "tipo", "Tipo"),
		modelo: obtenerCampo(valor, "modelo", "Modelo"),
		capacidad: obtenerCampo(valor, "capacidad", "Capacidad"),
		ruta_cotidiana: obtenerCampo(valor, "rutaCotidiana", "RutaCotidiana", "ruta_cotidiana") ?? null,
		foto_vehiculo: obtenerCampo(valor, "foto", "Foto", "foto_vehiculo") ?? null,
		...(puertas !== undefined && { numero_puertas: puertas }),
		...(modalidad !== undefined && { modalidad }),
	};
}

async function consultarUltimoVehiculo(idUsuario: string) {
	const resultado = await getDbPool().query(
		`SELECT v.id_vehiculo, v."IdUsuario" AS id_usuario,
		        v."Tipo" AS tipo, v."Modelo" AS modelo, v."Capacidad" AS capacidad,
		        NULL::text AS ruta_cotidiana, v."Foto" AS foto_vehiculo,
		        a.numero_puertas, m.modalidad
		 FROM vehiculo v
		 LEFT JOIN automovil a ON a.id_vehiculo = v.id_vehiculo
		 LEFT JOIN moto m ON m.id_vehiculo = v.id_vehiculo
		 WHERE v."IdUsuario" = $1
		 ORDER BY v.id_vehiculo DESC
		 LIMIT 1`,
		[idUsuario],
	);
	return resultado.rows[0] ?? null;
}

async function registrarVehiculoEnBaseDatos(datos: DatosNuevoVehiculo) {
	const client = await getDbPool().connect();
	try {
		await client.query("BEGIN");
		const resultado = await client.query(
			`INSERT INTO vehiculo ("IdUsuario", "Tipo", "Modelo", "Capacidad", "Foto")
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING id_vehiculo, "IdUsuario" AS id_usuario,
			           "Tipo" AS tipo, "Modelo" AS modelo, "Capacidad" AS capacidad,
			           NULL::text AS ruta_cotidiana, "Foto" AS foto_vehiculo`,
			[
				datos.id_usuario,
				datos.tipo,
				datos.modelo,
				datos.capacidad,
				datos.foto_vehiculo,
			],
		);
		const vehiculo = resultado.rows[0];

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
		} else {
			await client.query(
				"INSERT INTO bicicleta_electrica (id_vehiculo) VALUES ($1)",
				[vehiculo.id_vehiculo],
			);
		}

		await client.query("COMMIT");
		return vehiculo;
	} catch (error) {
		try {
			await client.query("ROLLBACK");
		} catch (rollbackError) {
			console.error("No se pudo revertir el registro del vehículo:", rollbackError);
		}
		throw error;
	} finally {
		client.release();
	}
}

function responderErrorRegistroVehiculo(error: unknown) {
	console.error("Error al registrar vehículo en la base de datos:", error);
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
		{ error: "No se pudo registrar el vehículo en la base de datos." },
		{ status: 500 },
	);
}

/**
 * Obtiene el vehículo más reciente del usuario autenticado desde la API.
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

	const baseApi = obtenerBaseApi();
	if (!baseApi) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL." },
			{ status: 500 },
		);
	}

	try {
		const respuesta = await fetch(`${baseApi}/api/vehiculos`, {
			cache: "no-store",
		});
		if (respuesta.status === 404) {
			return NextResponse.json({
				vehiculo: await consultarUltimoVehiculo(sesion.id),
			});
		}
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los vehículos.");
		}

		const resultado: unknown = await respuesta.json();
		if (!Array.isArray(resultado)) {
			console.error("La API de vehículos devolvió una lista inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de vehículos no es válida." },
				{ status: 502 },
			);
		}

		const vehiculos = resultado
			.filter((item) => {
				if (!esRegistro(item)) {
					return false;
				}
				return String(obtenerCampo(item, "idUsuario", "IdUsuario", "id_usuario")) === sesion.id;
			})
			.sort((a, b) => {
				const idA = Number(obtenerCampo(a, "idVehiculo", "IdVehiculo", "id_vehiculo"));
				const idB = Number(obtenerCampo(b, "idVehiculo", "IdVehiculo", "id_vehiculo"));
				return idB - idA;
			});

		return NextResponse.json({
			vehiculo: vehiculos.length > 0 ? normalizarVehiculo(vehiculos[0]) : null,
		});
	} catch (error) {
		console.error("No se pudo consultar el vehículo en el backend ni en la base de datos:", error);
		return NextResponse.json(
			{ error: "No se pudo consultar el vehículo. Verifica la conexión con el backend o la base de datos." },
			{ status: 502 },
		);
	}
}

/**
 * Registra el vehículo base y su subtipo en los endpoints del backend.
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

	const baseApi = obtenerBaseApi();
	if (!baseApi) {
		return NextResponse.json(
			{ error: "Falta configurar VITE_API_URL." },
			{ status: 500 },
		);
	}

	const datos = validacion.datos;
	try {
		const respuesta = await fetch(`${baseApi}/api/vehiculos`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				Tipo: datos.tipo,
				Modelo: datos.modelo,
				Capacidad: datos.capacidad,
				Foto: datos.foto_vehiculo,
				IdUsuario: Number(sesion.id),
			}),
			cache: "no-store",
		});
		if (respuesta.status === 404) {
			try {
				const vehiculo = await registrarVehiculoEnBaseDatos(datos);
				return NextResponse.json({ vehiculo }, { status: 201 });
			} catch (error) {
				return responderErrorRegistroVehiculo(error);
			}
		}
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo registrar el vehículo.");
		}

		const vehiculoApi: unknown = await respuesta.json();
		const vehiculo = normalizarVehiculo(vehiculoApi);
		const idVehiculo = vehiculo?.id_vehiculo;
		if (!vehiculo || (typeof idVehiculo !== "number" && typeof idVehiculo !== "string")) {
			console.error("La API de vehículos no devolvió el identificador del vehículo creado.");
			return NextResponse.json(
				{ error: "La respuesta de la API de vehículos no es válida." },
				{ status: 502 },
			);
		}

		const id = encodeURIComponent(String(idVehiculo));
		const subtipo = datos.tipo === "Automovil"
			? { ruta: "automoviles", cuerpo: { NumeroPuertas: datos.numero_puertas } }
			: datos.tipo === "Moto"
				? { ruta: "motos", cuerpo: { Modalidad: datos.modalidad } }
				: { ruta: "bicicletas-electricas", cuerpo: {} };

		const respuestaSubtipo = await fetch(`${baseApi}/api/${subtipo.ruta}/${id}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(subtipo.cuerpo),
			cache: "no-store",
		});
		if (!respuestaSubtipo.ok) {
			const errorSubtipo = await respuestaSubtipo.text();
			try {
				const respuestaLimpieza = await fetch(`${baseApi}/api/vehiculos/${id}`, {
					method: "DELETE",
					cache: "no-store",
				});
				if (!respuestaLimpieza.ok) {
					console.error(
						`No se pudo eliminar el vehículo incompleto ${idVehiculo}:`,
						await respuestaLimpieza.text(),
					);
				}
			} catch (error) {
				console.error(`No se pudo limpiar el vehículo incompleto ${idVehiculo}:`, error);
			}
			return NextResponse.json(
				{ error: errorSubtipo || "No se pudo registrar el tipo de vehículo." },
				{ status: respuestaSubtipo.status },
			);
		}

		return NextResponse.json(
			{
				vehiculo: {
					...vehiculo,
					ruta_cotidiana: datos.ruta_cotidiana,
					foto_vehiculo: datos.foto_vehiculo,
					...(datos.tipo === "Automovil" && {
						numero_puertas: datos.numero_puertas,
					}),
					...(datos.tipo === "Moto" && { modalidad: datos.modalidad }),
				},
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("No se pudo registrar el vehículo en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de vehículos." },
			{ status: 502 },
		);
	}
}
