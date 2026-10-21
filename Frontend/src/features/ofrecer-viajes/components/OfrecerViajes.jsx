"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import BarrioDropdown from "./BarrioDropdown";
import EsperandoPasajeros from "./EsperandoPasajeros";
import PuntoEncuentroDropdown from "./PuntoEncuentroDropdown";
import RegistroVehiculo from "./RegistroVehiculo";
import Swal from "sweetalert2";

// Pantalla principal para registrar el vehículo del usuario y publicar un viaje.
// También muestra el detalle del pasajero cuando el componente padre selecciona uno.
const PRECIOS_SUGERIDOS = [3000, 4000, 5000];
const UNIVERSIDAD_POPULAR_CESAR = "Universidad Popular Del Cesar";
const LUGARES_ADICIONALES = [UNIVERSIDAD_POPULAR_CESAR];
const MINUTOS_POR_DEFECTO_SALIDA = 5;

// useSyncExternalStore requiere una función de suscripción; sessionStorage no
// emite cambios entre componentes, así que esta función no registra listeners.
function suscribirSesion() {
  return () => {};
}

// Lee el identificador guardado durante la sesión del navegador.
function obtenerIdUsuario() {
  return window.sessionStorage.getItem("cozymov-usuario-id") || "";
}

// Presenta valores numéricos con el formato de moneda colombiano.
function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(precio);
}

// Convierte una fecha local a las cadenas que esperan los controles date y time.
function obtenerPartesFechaHora(fecha) {
  const dosDigitos = (numero) => String(numero).padStart(2, "0");
  return {
    fecha: `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`,
    hora: `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`,
  };
}

export default function OfrecerViajes({
  pasajeroSeleccionado,
  setPasajeroSeleccionado,
  mensajeAccion,
  setMensajeAccion,
}) {
  const [vehiculoGuardado, setVehiculoGuardado] = useState(null);
  const idUsuario = useSyncExternalStore(suscribirSesion, obtenerIdUsuario, () => "");
  const [cargandoVehiculo, setCargandoVehiculo] = useState(true);
  const [consultaFallida, setConsultaFallida] = useState(false);
  const [intentoConsulta, setIntentoConsulta] = useState(0);
  const [vehiculo, setVehiculo] = useState({
    tipo: "",
    modelo: "",
    capacidad: "",
    rutaCotidiana: "",
    numeroPuertas: "",
  });
  const [errorVehiculo, setErrorVehiculo] = useState("");
  const [origen, setOrigen] = useState(UNIVERSIDAD_POPULAR_CESAR);
  const [destino, setDestino] = useState(UNIVERSIDAD_POPULAR_CESAR);
  const [puntoEncuentro, setPuntoEncuentro] = useState("");
  const [precioPasaje, setPrecioPasaje] = useState("");
  const [cuposDisponibles, setCuposDisponibles] = useState("1");
  const [informacionAdicional, setInformacionAdicional] = useState("");
  const [fechaSalida, setFechaSalida] = useState("");
  const [horaSalida, setHoraSalida] = useState("");
  const [atajoSalida, setAtajoSalida] = useState(String(MINUTOS_POR_DEFECTO_SALIDA));
  const [errorPublicacion, setErrorPublicacion] = useState("");
  const [viajePublicado, setViajePublicado] = useState(null);
  const temporizadorPublicacion = useRef(null);

  // Cierra alertas y limpia el temporizador si el componente se desmonta.
  useEffect(
    () => () => {
      window.clearTimeout(temporizadorPublicacion.current);
      Swal.close();
    },
    [],
  );

  // Carga el vehículo del usuario. Si existe, intenta restaurar también su
  // viaje activo; un fallo de esa consulta opcional no impide usar la pantalla.
  useEffect(() => {
    if (!idUsuario) return;
    const controlador = new AbortController();

    async function cargarVehiculo() {
      try {
        const respuesta = await fetch(
          `/api/vehiculo?id_usuario=${encodeURIComponent(idUsuario)}`,
          { signal: controlador.signal },
        );
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
          throw new Error(resultado.error || "No se pudo consultar el vehículo.");
        }

        setVehiculoGuardado(resultado.vehiculo);
        setConsultaFallida(false);

        if (resultado.vehiculo) {
          try {
            const resViaje = await fetch(
              `/api/viajes?id_usuario=${encodeURIComponent(idUsuario)}`,
              { signal: controlador.signal }
            );
            if (resViaje.ok) {
              const dataViaje = await resViaje.json();
              if (dataViaje.viaje) {
                setViajePublicado({
                  idViaje: dataViaje.viaje.id_viaje,
                  origen: dataViaje.viaje.origen,
                  destino: dataViaje.viaje.destino,
                  puntoEncuentro: dataViaje.viaje.punto_encuentro,
                  precioPasaje: dataViaje.viaje.precio_pasaje,
                  cuposDisponibles: dataViaje.viaje.cupos_disponibles,
                  fechaSalida: dataViaje.viaje.fecha_salida
                    ? String(dataViaje.viaje.fecha_salida).split("T")[0]
                    : "",
                  horaSalida: dataViaje.viaje.hora_salida
                    ? String(dataViaje.viaje.hora_salida).slice(0, 5)
                    : "",
                  informacionAdicional: dataViaje.viaje.informacion_adicional || "",
                });
              }
            }
          } catch {
            // Ignorar errores de carga inicial opcional
          }
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("No se pudo consultar el vehículo en la nube:", error);
        setConsultaFallida(true);
        setErrorVehiculo(
          error.message || "No se pudo consultar tu vehículo. Inténtalo de nuevo.",
        );
      } finally {
        if (!controlador.signal.aborted) setCargandoVehiculo(false);
      }
    }

    void cargarVehiculo();
    return () => controlador.abort();
  }, [idUsuario, intentoConsulta]);

  // Inicializa la hora de salida con el valor predeterminado unos minutos adelante.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const salidaPredeterminada = new Date(
        Date.now() + MINUTOS_POR_DEFECTO_SALIDA * 60 * 1000,
      );
      const partesSalida = obtenerPartesFechaHora(salidaPredeterminada);
      setFechaSalida(partesSalida.fecha);
      setHoraSalida(partesSalida.hora);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Actualiza el formulario de vehículo y reinicia los campos que dependen del tipo.
  function cambiarCampoVehiculo(campo, valor) {
    setVehiculo((anterior) => {
      if (campo === "tipo") {
        return {
          ...anterior,
          tipo: valor,
          capacidad: "",
          numeroPuertas: "",
          modalidad: "",
        };
      }

      return { ...anterior, [campo]: valor };
    });
    setErrorVehiculo("");
  }

  // Valida de forma básica la sesión y envía el vehículo a la API del servidor.
  async function guardarVehiculo(evento) {
    evento.preventDefault();
    void Swal.fire({
      title: "Registrando vehículo",
      text: "Estamos guardando tu información en la nube.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });
    temporizadorRegistro.current = window.setTimeout(() => {
      try {
        const vehiculoParaGuardar = {
          tipo: vehiculo.tipo,
          modelo: vehiculo.modelo,
          rutaCotidiana: vehiculo.rutaCotidiana,
          ...(vehiculo.tipo === "automovil" && {
            numeroPuertas: Number(vehiculo.numeroPuertas),
          }),
        };
        window.localStorage.setItem(VEHICULO_STORAGE_KEY, JSON.stringify(vehiculoParaGuardar));
        ultimoVehiculoSerializado = null;
        ultimoVehiculoGuardado = null;
        notificarCambioVehiculo();
        setErrorVehiculo("");
        void Swal.fire({
          icon: "success",
          title: "¡Registro exitoso!",
          text: "Tu vehículo se registró correctamente.",
          confirmButtonText: "Continuar",
          allowOutsideClick: false,
          allowEscapeKey: false,
        });
      } catch (error) {
        console.error("No se pudo guardar el vehículo en localStorage:", error);
        setErrorVehiculo("No se pudo guardar el vehículo. Inténtalo de nuevo.");
        void Swal.fire({
          icon: "error",
          text: "No se pudo guardar el vehículo. Inténtalo de nuevo.",
        });
      }
    }, 2000);
  }

  // Comprueba los campos, publica el viaje en la API y adapta la respuesta del
  // servidor al formato que consumen las vistas de confirmación y edición.
  async function publicarViaje(evento) {
    evento.preventDefault();
    if (!idUsuario) {
      setErrorPublicacion("Inicia sesión para poder publicar un viaje.");
      return;
    }

    if (!vehiculoGuardado?.id_vehiculo) {
      setErrorPublicacion("Debes registrar un vehículo antes de publicar un viaje.");
      return;
    }

    if (origen === destino) {
      setErrorPublicacion("El origen y el destino deben ser diferentes.");
      return;
    }

    if (!puntoEncuentro) {
      setErrorPublicacion("Selecciona un punto específico de encuentro.");
      return;
    }

    if (!origen || !destino) {
      setErrorPublicacion("Selecciona un barrio de origen y uno de destino.");
      return;
    }

    const precio = Number(precioPasaje);
    if (!Number.isSafeInteger(precio) || precio <= 0) {
      setErrorPublicacion("Ingresa un precio válido, mayor que cero pesos.");
      return;
    }

    const cupos = Number(cuposDisponibles);
    if (!Number.isInteger(cupos) || cupos < 1 || cupos > 7) {
      setErrorPublicacion("Los cupos disponibles deben estar entre 1 y 7.");
      return;
    }

    if (!fechaSalida || !horaSalida) {
      setErrorPublicacion("Selecciona la fecha y la hora de salida.");
      return;
    }

    const salida = new Date(`${fechaSalida}T${horaSalida}`);
    const ahora = new Date();
    ahora.setSeconds(0, 0);
    if (Number.isNaN(salida.getTime()) || salida < ahora) {
      setErrorPublicacion("La fecha y hora de salida no pueden estar en el pasado.");
      return;
    }

    setErrorPublicacion("");

    void Swal.fire({
      title: "Guardando viaje",
      text: "Estamos registrando tu viaje en la base de datos...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const respuesta = await fetch("/api/viajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: idUsuario,
          id_vehiculo: Number(vehiculoGuardado.id_vehiculo),
          origen,
          destino,
          punto_encuentro: puntoEncuentro,
          precio_pasaje: precio,
          cupos_disponibles: cupos,
          fecha_salida: fechaSalida,
          hora_salida: horaSalida,
          informacion_adicional: informacionAdicional.trim(),
        }),
      });

      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo guardar el viaje.");
      }

      const viajeGuardadoServidor = {
        idViaje: resultado.viaje.id_viaje,
        origen: resultado.viaje.origen,
        destino: resultado.viaje.destino,
        puntoEncuentro: resultado.viaje.punto_encuentro,
        precioPasaje: resultado.viaje.precio_pasaje,
        cuposDisponibles: resultado.viaje.cupos_disponibles,
        fechaSalida: typeof resultado.viaje.fecha_salida === "string" ? resultado.viaje.fecha_salida.split("T")[0] : fechaSalida,
        horaSalida: typeof resultado.viaje.hora_salida === "string" ? resultado.viaje.hora_salida.slice(0, 5) : horaSalida,
        informacionAdicional: resultado.viaje.informacion_adicional || "",
      };

      void Swal.fire({
        icon: "success",
        title: "¡Viaje publicado!",
        text: "Tu viaje se ha guardado correctamente en la base de datos.",
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(({ isConfirmed }) => {
        if (isConfirmed) confirmarPublicacion(viajeGuardadoServidor);
      });
    } catch (error) {
      console.error("Error al guardar el viaje:", error);
      const mensaje = error.message || "No se pudo guardar el viaje. Inténtalo de nuevo.";
      setErrorPublicacion(mensaje);
      void Swal.fire({
        icon: "error",
        title: "Error",
        text: mensaje,
      });
    }
  }

  // Cambia a la vista de confirmación después de que el usuario acepta el aviso.
  function confirmarPublicacion(viaje) {
    setViajePublicado(viaje);
  }

  // Recupera los datos del viaje publicado para permitir editar el formulario.
  function editarViajePublicado() {
    setOrigen(viajePublicado.origen);
    setDestino(viajePublicado.destino);
    setPuntoEncuentro(viajePublicado.puntoEncuentro);
    setPrecioPasaje(String(viajePublicado.precioPasaje));
    setCuposDisponibles(String(viajePublicado.cuposDisponibles));
    setInformacionAdicional(viajePublicado.informacionAdicional || "");
    setFechaSalida(viajePublicado.fechaSalida);
    setHoraSalida(viajePublicado.horaSalida);
    setAtajoSalida("");
    setViajePublicado(null);
    setErrorPublicacion("");
  }

  // Reinicia los campos para empezar otro viaje; no elimina el anterior de la base.
  function prepararOtroViaje() {
    setViajePublicado(null);
    setOrigen(UNIVERSIDAD_POPULAR_CESAR);
    setDestino(UNIVERSIDAD_POPULAR_CESAR);
    setPuntoEncuentro("");
    setPrecioPasaje("");
    setCuposDisponibles("1");
    setInformacionAdicional("");
    const salidaPredeterminada = new Date(
      Date.now() + MINUTOS_POR_DEFECTO_SALIDA * 60 * 1000,
    );
    const partesSalida = obtenerPartesFechaHora(salidaPredeterminada);
    setFechaSalida(partesSalida.fecha);
    setHoraSalida(partesSalida.hora);
    setAtajoSalida(String(MINUTOS_POR_DEFECTO_SALIDA));
    setErrorPublicacion("");
  }

  // Esta acción solo muestra una confirmación local; no registra una solicitud en el servidor.
  function aceptarPasajero() {
    setMensajeAccion(`Has aceptado la solicitud de ${pasajeroSeleccionado.nombre}.`);
  }

  // Sin identificador de sesión no se intenta cargar ni registrar información.
  if (!idUsuario) {
    return (
      <div className="vista">
        <div className="alert alert-danger" role="alert">
          Inicia sesión para registrar y consultar tu vehículo.
        </div>
      </div>
    );
  }

  // Espera a que termine la consulta inicial del vehículo.
  if (cargandoVehiculo) {
    return <div className="vista" role="status">Consultando tu vehículo...</div>;
  }

  // Si aún no hay vehículo, presenta el formulario o permite reintentar la consulta.
  if (vehiculoGuardado === null) {
    if (consultaFallida) {
      return (
        <div className="vista">
          <div className="alert alert-danger" role="alert">
            {errorVehiculo}
            <button
              className="btn btn-outline-danger d-block mt-3"
              type="button"
              onClick={() => {
                setCargandoVehiculo(true);
                setIntentoConsulta((intento) => intento + 1);
              }}
            >
              Volver a consultar
            </button>
          </div>
        </div>
      );
    }

    // Una vez cargado el vehículo, muestra el viaje activo, el formulario de
    // publicación o el detalle de pasajero según el estado y las props recibidas.
    return (
      <>
        <RegistroVehiculo
          vehiculo={vehiculo}
          error={errorVehiculo}
          onFieldChange={cambiarCampoVehiculo}
          onSubmit={guardarVehiculo}
        />
      </>
    );
  }

  return (
    <div className="vista">
      {viajePublicado ? (
        <EsperandoPasajeros
          viaje={viajePublicado}
          onEditarViaje={editarViajePublicado}
          onPublicarOtro={prepararOtroViaje}
        />
      ) : pasajeroSeleccionado === null ? (
        <section className="card color-card mx-auto w-100" style={{ maxWidth: 720 }}>
          <form className="card-body p-4 p-md-5" onSubmit={publicarViaje}>
            <div className="d-flex align-items-center gap-3 mb-4">
              <span className="fs-2" aria-hidden="true">🗺️</span>
              <div>
                <h3 className="h4 letra-contenido mb-1">Ruta y puntos de recorrido</h3>
                <p className="texto-secundario mb-0">Elige el barrio de origen y el de destino.</p>
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <BarrioDropdown
                  id="origen-viaje"
                  label="Origen"
                  value={origen}
                  opcionesAdicionales={LUGARES_ADICIONALES}
                  onChange={(barrio) => {
                    setOrigen(barrio);
                    setErrorPublicacion(
                      barrio === destino
                        ? "El origen y el destino deben ser diferentes."
                        : "",
                    );
                  }}
                />
              </div>
              <div className="col-md-6">
                <BarrioDropdown
                  id="destino-viaje"
                  label="Destino"
                  value={destino}
                  opcionesAdicionales={LUGARES_ADICIONALES}
                  onChange={(barrio) => {
                    setDestino(barrio);
                    setErrorPublicacion(
                      barrio === origen
                        ? "El origen y el destino deben ser diferentes."
                        : "",
                    );
                  }}
                />
              </div>
            </div>

            <div className="rounded-3 bg-light p-3 mb-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h4 className="h6 fw-semibold mb-0">Fecha y hora de salida</h4>
                <label className="visually-hidden" htmlFor="atajo-salida">
                  Seleccionar hora rápida de salida
                </label>
                <select
                  className="form-select form-select-sm"
                  id="atajo-salida"
                  value={atajoSalida}
                  onChange={(evento) => {
                    const minutosAdelante = Number(evento.target.value);
                    const salida = new Date();
                    salida.setSeconds(0, 0);
                    salida.setMinutes(salida.getMinutes() + minutosAdelante);
                    const partes = obtenerPartesFechaHora(salida);
                    setFechaSalida(partes.fecha);
                    setHoraSalida(partes.hora);
                    setAtajoSalida(evento.target.value);
                    setErrorPublicacion("");
                  }}
                  style={{ maxWidth: 220 }}
                >
                  <option value="">Hora rápida...</option>
                  <option value="0">Ahora</option>
                  <option value="5">En 5 minutos</option>
                  <option value="15">En 15 minutos</option>
                  <option value="30">En 30 minutos</option>
                  <option value="60">En 1 hora</option>
                  <option value="120">En 2 horas</option>
                </select>
              </div>
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="fecha-salida">Fecha</label>
                  <input
                    className="form-control"
                    id="fecha-salida"
                    type="date"
                    min={fechaSalida || undefined}
                    value={fechaSalida}
                    onChange={(evento) => {
                      setFechaSalida(evento.target.value);
                      setAtajoSalida("");
                      setErrorPublicacion("");
                    }}
                    required
                  />
                </div>
                <div className="col-sm-6">
                  <label className="form-label" htmlFor="hora-salida">Hora</label>
                  <input
                    className="form-control"
                    id="hora-salida"
                    type="time"
                    value={horaSalida}
                    onChange={(evento) => {
                      setHoraSalida(evento.target.value);
                      setAtajoSalida("");
                      setErrorPublicacion("");
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3 bg-light p-3 mb-4">
              <label className="form-label fw-semibold" htmlFor="precio-pasaje">
                Precio del pasaje
              </label>
              <div className="input-group mb-3">
                <span className="input-group-text">$</span>
                <input
                  className="form-control"
                  id="precio-pasaje"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="Escribe el precio que quieras"
                  value={precioPasaje}
                  onChange={(evento) => {
                    setPrecioPasaje(evento.target.value);
                    setErrorPublicacion("");
                  }}
                  aria-describedby="precio-pasaje-ayuda"
                  required
                />
                <span className="input-group-text">COP</span>
              </div>
              <small className="d-block text-secondary mb-2" id="precio-pasaje-ayuda">
                Escribe el precio que cobrarás o selecciona una sugerencia:
              </small>
              <div className="d-flex flex-wrap gap-2" aria-label="Precios sugeridos">
                {PRECIOS_SUGERIDOS.map((precio) => (
                  <button
                    key={precio}
                    type="button"
                    className={`btn btn-sm ${Number(precioPasaje) === precio ? "btn-primary" : "btn-outline-primary"}`}
                    aria-pressed={Number(precioPasaje) === precio}
                    onClick={() => {
                      setPrecioPasaje(String(precio));
                      setErrorPublicacion("");
                    }}
                  >
                    {formatearPrecio(precio)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="cupos-disponibles">
                Cupos disponibles
              </label>
              <input
                className="form-control"
                id="cupos-disponibles"
                type="number"
                min="1"
                max="7"
                step="1"
                inputMode="numeric"
                value={cuposDisponibles}
                onChange={(evento) => {
                  setCuposDisponibles(evento.target.value);
                  setErrorPublicacion("");
                }}
                aria-describedby="cupos-disponibles-ayuda"
                required
              />
              <small className="d-block text-secondary mt-1" id="cupos-disponibles-ayuda">
                Indica cuántos pasajeros puedes llevar (máximo 7).
              </small>
            </div>

            <div className="mb-4">
              <PuntoEncuentroDropdown
                value={puntoEncuentro}
                onChange={(punto) => {
                  setPuntoEncuentro(punto);
                  setErrorPublicacion("");
                }}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold" htmlFor="informacion-adicional">
                Información adicional <span className="text-secondary fw-normal">(opcional)</span>
              </label>
              <textarea
                className="form-control"
                id="informacion-adicional"
                rows="3"
                maxLength="500"
                placeholder="Agrega indicaciones u otros detalles para tus pasajeros..."
                value={informacionAdicional}
                onChange={(evento) => setInformacionAdicional(evento.target.value)}
                aria-describedby="informacion-adicional-ayuda"
              />
              <small className="d-block text-secondary mt-1" id="informacion-adicional-ayuda">
                Máximo 500 caracteres.
              </small>
            </div>

            {errorPublicacion && (
              <p className="small text-danger mb-3" role="alert">
                {errorPublicacion}
              </p>
            )}

            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary fw-bold px-4">
                Publicar viaje
              </button>
            </div>
          </form>
        </section>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn-link texto-secundario ps-0 mb-3"
            onClick={() => {
              setPasajeroSeleccionado(null);
              setMensajeAccion("");
            }}
          >
            ‹ Volver a pasajeros
          </button>

          <div className="row g-3">
            <div className="col-lg-5">
              <div className="card p-3 color-card">
                <h5 className="letra-contenido mb-0">{pasajeroSeleccionado.ruta}</h5>
                <small className="texto-secundario d-block mb-3">{pasajeroSeleccionado.horario}</small>

                <div className="d-flex align-items-center gap-2 mb-3">
                  <div
                    className={"user-avatar " + pasajeroSeleccionado.avatarColor}
                    style={{ width: 42, height: 42 }}
                  >
                    {pasajeroSeleccionado.iniciales}
                  </div>
                  <div>
                    <div className="fw-semibold letra-contenido">{pasajeroSeleccionado.nombre}</div>
                    <small className="texto-secundario">★ {pasajeroSeleccionado.rating} · {pasajeroSeleccionado.viajes} viajes</small>
                  </div>
                </div>

                <small className="texto-secundario d-block">Punto de encuentro</small>
                <p className="fw-semibold mb-2" style={{ color: "#a03c3c" }}>{pasajeroSeleccionado.punto}</p>

                <small className="texto-secundario d-block">Personas que viajan</small>
                <p className="fw-semibold mb-3" style={{ color: "#1457e7" }}>{pasajeroSeleccionado.personas} persona(s)</p>

                <button type="button" className="btn btn-primary w-100" onClick={aceptarPasajero}>
                  Aceptar Pasajero
                </button>
                {mensajeAccion && <p className="alert alert-success mt-3 mb-0">{mensajeAccion}</p>}
              </div>
            </div>

            <div className="col-lg-7">
              <div className="card color-card p-3 h-100 d-flex align-items-center justify-content-center text-center">
                <div style={{ fontSize: "3.5rem" }}>🗺️</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
