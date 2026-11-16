import { NextResponse } from "next/server";
import {
	validarIdUsuarioVehiculo,
	validarNuevoVehiculo,
} from "../../../src/features/ofrecer-viajes/validations/vehiculos";
import { obtenerSesionActual } from "../../../src/lib/auth";
import { getBackendApiConfig } from "../../../src/lib/backendApi";

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

function obtenerConfigApi() {
	return getBackendApiConfig();
}

const ERROR_CONFIG = "Falta configurar VITE_API_URL o INTERNAL_API_KEY.";

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

	const config = obtenerConfigApi();
	if (!config) {
		return NextResponse.json(
			{ error: ERROR_CONFIG },
			{ status: 500 },
		);
	}

	try {
		const respuesta = await fetch(`${config.baseUrl}/api/vehiculos`, {
			headers: { ...config.headers },
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudieron consultar los vehículos.");
		}

		const resultado: unknown = await respuesta.json();
		if (!Array.isArray(resultado) || !resultado.every(esRegistro)) {
			console.error("La API de vehículos devolvió una lista inválida.");
			return NextResponse.json(
				{ error: "La respuesta de la API de vehículos no es válida." },
				{ status: 502 },
			);
		}

		const vehiculos = resultado
			.filter((item) =>
				String(obtenerCampo(item, "idUsuario", "IdUsuario", "id_usuario")) === sesion.id
			)
			.sort((a, b) => {
				const idA = Number(obtenerCampo(a, "idVehiculo", "IdVehiculo", "id_vehiculo"));
				const idB = Number(obtenerCampo(b, "idVehiculo", "IdVehiculo", "id_vehiculo"));
				return idB - idA;
			});

		return NextResponse.json({
			vehiculo: vehiculos.length > 0 ? normalizarVehiculo(vehiculos[0]) : null,
		});
	} catch (error) {
		console.error("No se pudo consultar el vehículo en el backend:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de vehículos." },
			{ status: 502 },
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
		return NextResponse.json(
			{ error: "El cuerpo de solicitud no es válido." },
			{ status: 400 },
		);
	}

	const validacion = validarNuevoVehiculo(body, sesion.id);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}

	const config = obtenerConfigApi();
	if (!config) {
		return NextResponse.json(
			{ error: ERROR_CONFIG },
			{ status: 500 },
		);
	}

	const datos = validacion.datos;
	try {
		const respuesta = await fetch(`${config.baseUrl}/api/vehiculos`, {
			method: "POST",
			headers: { ...config.headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				Tipo: datos.tipo,
				Modelo: datos.modelo,
				Capacidad: datos.capacidad,
				Foto: datos.foto_vehiculo,
				IdUsuario: Number(sesion.id),
			}),
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo registrar el vehículo.");
		}

		const vehiculoApi: unknown = await respuesta.json();
		const vehiculo = normalizarVehiculo(vehiculoApi);
		const idVehiculo = vehiculo?.id_vehiculo;
		if (!vehiculo || (typeof idVehiculo !== "number" && typeof idVehiculo !== "string")) {
			console.error("La API no devolvió el identificador del vehículo creado.");
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
		const respuestaSubtipo = await fetch(`${config.baseUrl}/api/${subtipo.ruta}/${id}`, {
			method: "POST",
			headers: { ...config.headers, "Content-Type": "application/json" },
			body: JSON.stringify(subtipo.cuerpo),
			cache: "no-store",
		});

		if (!respuestaSubtipo.ok) {
			const errorSubtipo = await respuestaSubtipo.text();
			try {
				const respuestaLimpieza = await fetch(`${config.baseUrl}/api/vehiculos/${id}`, {
					method: "DELETE",
					headers: { ...config.headers },
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

export async function PUT(request: Request) {
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

	// El usuario sale siempre de la sesión; cualquier id_usuario del cliente se ignora.
	const validacion = validarNuevoVehiculo(body, sesion.id);
	if (!validacion.valido) {
		return NextResponse.json({ error: validacion.error }, { status: 400 });
	}

	const idVehiculo = esRegistro(body) ? String(body.id_vehiculo ?? "") : "";
	if (!/^[1-9]\d{0,17}$/.test(idVehiculo)) {
		return NextResponse.json({ error: "id_vehiculo no es válido." }, { status: 400 });
	}

	const config = obtenerConfigApi();
	if (!config) {
		return NextResponse.json({ error: ERROR_CONFIG }, { status: 500 });
	}

	const datos = validacion.datos;
	const urlVehiculo = `${config.baseUrl}/api/vehiculos/${idVehiculo}`;
	try {
		const actual = await fetch(urlVehiculo, {
			headers: { ...config.headers },
			cache: "no-store",
		});
		if (actual.status === 404) {
			return NextResponse.json({ error: "No se encontró el vehículo." }, { status: 404 });
		}
		if (!actual.ok) {
			return responderErrorApi(actual, "No se pudo verificar el vehículo.");
		}

		const vehiculoActual: unknown = await actual.json();
		const propietario = esRegistro(vehiculoActual)
			? String(obtenerCampo(vehiculoActual, "idUsuario", "IdUsuario", "id_usuario"))
			: null;
		if (propietario !== sesion.id) {
			return NextResponse.json(
				{ error: "No puedes editar el vehículo de otro usuario." },
				{ status: 403 },
			);
		}

		const respuesta = await fetch(urlVehiculo, {
			method: "PUT",
			headers: { ...config.headers, "Content-Type": "application/json" },
			body: JSON.stringify({
				Tipo: datos.tipo,
				Modelo: datos.modelo,
				Capacidad: datos.capacidad,
				Foto: datos.foto_vehiculo,
				...(datos.tipo === "Automovil" && { NumeroPuertas: datos.numero_puertas }),
				...(datos.tipo === "Moto" && { Modalidad: datos.modalidad }),
			}),
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo actualizar el vehículo.");
		}

		return NextResponse.json({
			vehiculo: {
				id_vehiculo: Number(idVehiculo),
				id_usuario: sesion.id,
				tipo: datos.tipo,
				modelo: datos.modelo,
				capacidad: datos.capacidad,
				foto_vehiculo: datos.foto_vehiculo,
				...(datos.tipo === "Automovil" && { numero_puertas: datos.numero_puertas }),
				...(datos.tipo === "Moto" && { modalidad: datos.modalidad }),
			},
		});
	} catch (error) {
		console.error("No se pudo actualizar el vehículo en la API:", error);
		return NextResponse.json(
			{ error: "No se pudo conectar con la API de vehículos." },
			{ status: 502 },
		);
	}
}
