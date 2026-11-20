import { NextResponse } from "next/server";
import {
	construirFormDataVehiculo,
	validarIdUsuarioVehiculo,
	validarNuevoVehiculo,
} from "../../../src/features/ofrecer-viajes/validations/vehiculos";
import { TIPO_API_POR_UI, TIPO_UI_POR_API } from "../../../src/features/ofrecer-viajes/constants/vehiculos";
import { obtenerSesionActual } from "../../../src/lib/auth";
import { getBackendApiConfig, mensajeErrorSeguro } from "../../../src/lib/backendApi";

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
			// ValidationProblemDetails: { errors: { campo: ["mensaje", ...] } }
			const errores = resultado.errors;
			if (respuesta.status < 500 && esRegistro(errores)) {
				const mensajes = Object.entries(errores).flatMap(([campo, lista]) =>
					Array.isArray(lista) ? lista.map((m) => `${campo}: ${String(m)}`) : [],
				);
				if (mensajes.length > 0) {
					error = mensajes.join(" ");
				}
			}
		}
	} catch {
		// El backend puede responder texto plano.
	}
	return NextResponse.json(
		{ error: mensajeErrorSeguro(respuesta.status, error, mensaje) },
		{ status: respuesta.status },
	);
}

function tipoParaInterfaz(tipo: unknown): unknown {
	return typeof tipo === "string" ? (TIPO_UI_POR_API[tipo] ?? tipo) : tipo;
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
		// La API devuelve el valor canónico (p. ej. "automovil"); la interfaz usa etiquetas.
		tipo: tipoParaInterfaz(obtenerCampo(valor, "tipo", "Tipo")),
		marca: obtenerCampo(valor, "marca", "Marca") ?? null,
		modelo: obtenerCampo(valor, "modelo", "Modelo"),
		foto_frontal: obtenerCampo(valor, "fotoFrontal", "FotoFrontal") ?? null,
		foto_lateral: obtenerCampo(valor, "fotoLateral", "FotoLateral") ?? null,
		foto_perfil: obtenerCampo(valor, "fotoPerfil", "FotoPerfil") ?? null,
		capacidad: obtenerCampo(valor, "capacidad", "Capacidad"),
		ruta_cotidiana: obtenerCampo(valor, "rutaCotidiana", "RutaCotidiana", "ruta_cotidiana") ?? null,
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

	let entrada: FormData;
	try {
		entrada = await request.formData();
	} catch {
		return NextResponse.json(
			{ error: "El cuerpo de solicitud no es válido." },
			{ status: 400 },
		);
	}

	const validacion = construirFormDataVehiculo(entrada, sesion.id);
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

	const rutaCotidiana = entrada.get("ruta_cotidiana");
	try {
		// Sin Content-Type: fetch lo fija con el boundary del multipart.
		const respuesta = await fetch(`${config.baseUrl}/api/vehiculos`, {
			method: "POST",
			headers: { ...config.headers },
			body: validacion.datos,
			cache: "no-store",
		});
		if (!respuesta.ok) {
			return responderErrorApi(respuesta, "No se pudo registrar el vehículo.");
		}

		const vehiculo = normalizarVehiculo(await respuesta.json());
		const idVehiculo = vehiculo?.id_vehiculo;
		if (!vehiculo || (typeof idVehiculo !== "number" && typeof idVehiculo !== "string")) {
			console.error("La API no devolvió el identificador del vehículo creado.");
			return NextResponse.json(
				{ error: "La respuesta de la API de vehículos no es válida." },
				{ status: 502 },
			);
		}

		return NextResponse.json(
			{
				vehiculo: {
					...vehiculo,
					ruta_cotidiana: typeof rutaCotidiana === "string" && rutaCotidiana ? rutaCotidiana : null,
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
				Tipo: TIPO_API_POR_UI[datos.tipo],
				Modelo: datos.modelo,
				Capacidad: datos.capacidad,
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
