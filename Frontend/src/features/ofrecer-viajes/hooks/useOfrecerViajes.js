// Coordina la carga del vehículo y las operaciones de publicación de viajes.
"use client";

import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  MINUTOS_POR_DEFECTO_SALIDA,
  UNIVERSIDAD_POPULAR_CESAR,
} from "../constants/ofrecerViajes";
import { obtenerPartesFechaHora } from "../utils/fechaHora";
import {
  validarDatosNuevoViaje,
  validarPermisoPublicarViaje,
} from "../../viajes/validations/viajes";
import { useSessionUserId } from "../../../hooks/useSessionUserId";

/**
 * Gestiona el vehículo del usuario y el ciclo de publicación de viajes.
 * @param {{pasajeroSeleccionado: object|null, setMensajeAccion: Function}} opciones Datos de la vista de pasajeros.
 * @returns Estado y acciones de los formularios de vehículo y viaje.
 */
export function useOfrecerViajes({ pasajeroSeleccionado, setMensajeAccion }) {
  // Datos del vehículo, carga inicial y acciones de consulta/registro.
  const [vehiculoGuardado, setVehiculoGuardado] = useState(null);
  const idUsuario = useSessionUserId();
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
  const [guardandoVehiculo, setGuardandoVehiculo] = useState(false);
  // Campos editables y estado de validación del formulario de viaje.
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

  useEffect(
    () => () => {
      window.clearTimeout(temporizadorPublicacion.current);
      Swal.close();
    },
    [],
  );

  useEffect(() => {
    if (!idUsuario) return;
    const controlador = new AbortController();

    /**
     * Consulta el vehículo y restaura un viaje activo si existe.
     * @returns {Promise<void>}
     */
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
              { signal: controlador.signal },
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
            // La consulta inicial del viaje es opcional para mostrar el vehículo.
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

  /**
   * Actualiza un campo del formulario del vehículo.
   * @param {string} campo Nombre del campo que se modificará.
   * @param {string} valor Nuevo valor del campo.
   * @returns {void}
   */
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

  /**
   * Guarda el vehículo asociado al usuario actual.
   * @param {React.FormEvent<HTMLFormElement>} evento Envío del formulario.
   * @returns {Promise<void>}
   */
  async function guardarVehiculo(evento) {
    evento.preventDefault();
    if (!idUsuario || guardandoVehiculo) return;

    setGuardandoVehiculo(true);
    setErrorVehiculo("");

    try {
      const datosVehiculo = {
        id_usuario: idUsuario,
        tipo: vehiculo.tipo,
        modelo: vehiculo.modelo.trim(),
        capacidad: Number(vehiculo.capacidad),
        ruta_cotidiana: vehiculo.rutaCotidiana || null,
        foto_vehiculo: null,
        ...(vehiculo.tipo === "Automovil" && {
          numero_puertas: Number(vehiculo.numeroPuertas),
        }),
        ...(vehiculo.tipo === "Moto" && {
          modalidad: vehiculo.modalidad.trim(),
        }),
      };
      const respuesta = await fetch("/api/vehiculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosVehiculo),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo guardar el vehículo.");
      }
      if (!resultado.vehiculo?.id_vehiculo) {
        throw new Error("El servidor no confirmó el registro del vehículo.");
      }

      setVehiculoGuardado(resultado.vehiculo);
      void Swal.fire({
        icon: "success",
        title: "¡Registro exitoso!",
        text: "Tu vehículo se guardó correctamente en la base de datos.",
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });
    } catch (error) {
      console.error("No se pudo guardar el vehículo en la base de datos:", error);
      setErrorVehiculo(
        error.message || "No se pudo guardar el vehículo. Inténtalo de nuevo.",
      );
    } finally {
      setGuardandoVehiculo(false);
    }
  }

  /**
   * Valida y registra el viaje publicado por el usuario.
   * @param {React.FormEvent<HTMLFormElement>} evento Envío del formulario.
   * @returns {Promise<void>}
   */
  async function publicarViaje(evento) {
    evento.preventDefault();
    const errorPermiso = validarPermisoPublicarViaje(
      idUsuario,
      vehiculoGuardado?.id_vehiculo,
    );
    if (errorPermiso) {
      setErrorPublicacion(errorPermiso);
      return;
    }

    const validacion = validarDatosNuevoViaje(
      {
        id_usuario: idUsuario,
        id_vehiculo: vehiculoGuardado.id_vehiculo,
        origen,
        destino,
        punto_encuentro: puntoEncuentro,
        precio_pasaje: precioPasaje,
        cupos_disponibles: cuposDisponibles,
        fecha_salida: fechaSalida,
        hora_salida: horaSalida,
        informacion_adicional: informacionAdicional,
      },
      idUsuario,
    );
    if (!validacion.valido) {
      setErrorPublicacion(validacion.error);
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
        body: JSON.stringify(validacion.datos),
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
        fechaSalida: typeof resultado.viaje.fecha_salida === "string"
          ? resultado.viaje.fecha_salida.split("T")[0]
          : fechaSalida,
        horaSalida: typeof resultado.viaje.hora_salida === "string"
          ? resultado.viaje.hora_salida.slice(0, 5)
          : horaSalida,
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
        if (isConfirmed) setViajePublicado(viajeGuardadoServidor);
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

  /**
   * Carga de nuevo el vehículo después de un error de consulta.
   * @returns {void}
   */
  function reintentarConsulta() {
    setCargandoVehiculo(true);
    setIntentoConsulta((intento) => intento + 1);
  }

  /**
   * Restaura los valores del viaje publicado en el formulario.
   * @returns {void}
   */
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

  /**
   * Reinicia el formulario para iniciar la publicación de otro viaje.
   * @returns {void}
   */
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

  /**
   * Actualiza el mensaje local tras aceptar una solicitud de pasajero.
   * @returns {void}
   */
  function aceptarPasajero() {
    setMensajeAccion(`Has aceptado la solicitud de ${pasajeroSeleccionado.nombre}.`);
  }

  return {
    idUsuario,
    vehiculoGuardado,
    cargandoVehiculo,
    consultaFallida,
    vehiculo,
    errorVehiculo,
    guardandoVehiculo,
    origen,
    setOrigen,
    destino,
    setDestino,
    puntoEncuentro,
    setPuntoEncuentro,
    precioPasaje,
    setPrecioPasaje,
    cuposDisponibles,
    setCuposDisponibles,
    informacionAdicional,
    setInformacionAdicional,
    fechaSalida,
    setFechaSalida,
    horaSalida,
    setHoraSalida,
    atajoSalida,
    setAtajoSalida,
    errorPublicacion,
    setErrorPublicacion,
    viajePublicado,
    cambiarCampoVehiculo,
    guardarVehiculo,
    publicarViaje,
    reintentarConsulta,
    editarViajePublicado,
    prepararOtroViaje,
    aceptarPasajero,
  };
}
