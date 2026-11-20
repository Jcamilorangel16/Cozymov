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
import { solicitudesPropiasPendientes } from "../../buscar-viajes/utils/solicitudes";

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
  /** @type {import("../types/vehiculos").EstadoFormularioVehiculo} */
  const [vehiculo, setVehiculo] = useState({
    tipo: "",
    marca: "",
    modelo: "",
    capacidad: "",
    rutaCotidiana: "",
    fotoFrontal: null,
    fotoLateral: null,
    fotoPerfil: null,
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
  const [estadoViajeEnCurso, setEstadoViajeEnCurso] = useState("cargando");
  const [intentoViajeEnCurso, setIntentoViajeEnCurso] = useState(0);
  const [viajePublicado, setViajePublicado] = useState(null);
  const [viajeEnEdicion, setViajeEnEdicion] = useState(null);
  const viajeEnEdicionRef = useRef(null);
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

    // Para publicar como conductor no hay que tener un viaje en curso ni una solicitud
    // de viaje pendiente (esperar conductor como pasajero).
    Promise.all([
      fetch("/api/viajes/en-curso", { signal: controlador.signal }),
      fetch("/api/solicitudes", { cache: "no-store", signal: controlador.signal }),
    ])
      .then(async ([respuestaEnCurso, respuestaSolicitudes]) => {
        const [resultado, solicitudes] = await Promise.all([
          respuestaEnCurso.json(),
          respuestaSolicitudes.json(),
        ]);
        if (!respuestaEnCurso.ok) {
          throw new Error(resultado.error || "No se pudo validar tu viaje en curso.");
        }
        if (!("viaje" in resultado)) {
          throw new Error("No se pudo validar tu viaje en curso.");
        }
        if (!respuestaSolicitudes.ok) {
          throw new Error(solicitudes.error || "No se pudieron validar tus solicitudes.");
        }
        if (resultado.viaje) {
          setEstadoViajeEnCurso("en-curso");
        } else if (solicitudesPropiasPendientes(solicitudes).length > 0) {
          setEstadoViajeEnCurso("solicitud-pendiente");
        } else {
          setEstadoViajeEnCurso("sin-viaje");
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("No se pudo validar el viaje en curso:", error);
          setEstadoViajeEnCurso("error");
        }
      });

    return () => controlador.abort();
  }, [idUsuario, intentoViajeEnCurso]);

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
   * @param {string|boolean|File|null} valor Nuevo valor del campo.
   * @returns {void}
   */
  function cambiarCampoVehiculo(campo, valor) {
    setVehiculo((anterior) => {
      if (campo === "tipo") {
        const {
          fotoPlaca,
          fotoLicencia,
          docTecnomecanica,
          docSoat,
        } = anterior;
        const camposCondicionales = [
          "numeroPuertas",
          "modalidad",
          "numeroSerie",
          "velocidadMaxima",
          "capacidadPeso",
          "capacidadVehicular",
          "casco",
          "chaleco",
          "luces",
          "fotoPlaca",
          "fotoLicencia",
          "docTecnomecanica",
          "docSoat",
        ];
        const camposBase = Object.fromEntries(
          Object.entries(anterior).filter(([nombre]) => !camposCondicionales.includes(nombre)),
        );
        const aplicaDocumentos = valor === "Automovil" || valor === "Moto";

        return {
          ...camposBase,
          tipo: valor,
          ...(valor === "Automovil" && { numeroPuertas: "" }),
          ...(valor === "Moto" && { modalidad: "" }),
          ...(valor === "Bicicleta electrica" && {
            numeroSerie: "",
            velocidadMaxima: "",
            capacidadPeso: "",
            capacidadVehicular: false,
            casco: false,
            chaleco: false,
            luces: false,
          }),
          ...(aplicaDocumentos && {
            fotoPlaca: fotoPlaca ?? null,
            fotoLicencia: fotoLicencia ?? null,
            docTecnomecanica: docTecnomecanica ?? null,
            docSoat: docSoat ?? null,
          }),
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
      // Los archivos viajan como multipart/form-data; los campos de texto, junto a ellos.
      const datos = new FormData();
      const agregar = (campo, valor) => {
        if (valor !== undefined && valor !== null && valor !== "") datos.set(campo, valor);
      };
      agregar("tipo", vehiculo.tipo);
      agregar("marca", vehiculo.marca.trim());
      agregar("modelo", vehiculo.modelo.trim());
      agregar("capacidad", vehiculo.capacidad);
      agregar("ruta_cotidiana", vehiculo.rutaCotidiana);
      agregar("foto_frontal", vehiculo.fotoFrontal);
      agregar("foto_lateral", vehiculo.fotoLateral);
      agregar("foto_perfil", vehiculo.fotoPerfil);
      if (vehiculo.tipo === "Automovil") {
        agregar("numero_puertas", vehiculo.numeroPuertas);
      }
      if (vehiculo.tipo === "Moto") {
        agregar("modalidad", vehiculo.modalidad?.trim());
      }
      if (vehiculo.tipo === "Automovil" || vehiculo.tipo === "Moto") {
        agregar("foto_placa", vehiculo.fotoPlaca);
        agregar("foto_licencia", vehiculo.fotoLicencia);
        agregar("doc_tecnomecanica", vehiculo.docTecnomecanica);
        agregar("doc_soat", vehiculo.docSoat);
      }
      if (vehiculo.tipo === "Bicicleta electrica") {
        agregar("numero_serie", vehiculo.numeroSerie?.trim());
        agregar("velocidad_maxima", vehiculo.velocidadMaxima);
        agregar("capacidad_peso", vehiculo.capacidadPeso);
        for (const campo of ["capacidadVehicular", "casco", "chaleco", "luces"]) {
          datos.set(
            campo.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()),
            vehiculo[campo] ? "true" : "false",
          );
        }
      }
      // Sin Content-Type: el navegador agrega el boundary del multipart.
      const respuesta = await fetch("/api/vehiculo", {
        method: "POST",
        body: datos,
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
    if (estadoViajeEnCurso !== "sin-viaje") {
      setErrorPublicacion(
        estadoViajeEnCurso === "en-curso"
          ? "No puedes publicar un viaje mientras tengas uno en curso."
          : estadoViajeEnCurso === "solicitud-pendiente"
            ? "No puedes publicar un viaje mientras tengas una solicitud de viaje pendiente."
            : "Espera a que se valide si tienes un viaje en curso.",
      );
      return;
    }

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
      const idViajeEnEdicion = viajeEnEdicionRef.current;
      const editando = idViajeEnEdicion !== null;
      if (
        editando &&
        (!Number.isSafeInteger(Number(idViajeEnEdicion)) || Number(idViajeEnEdicion) <= 0)
      ) {
        throw new Error("No se pudo identificar el viaje que quieres editar. Vuelve a cargarlo.");
      }

      const respuesta = await fetch("/api/viajes", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editando
            ? { ...validacion.datos, id_viaje: idViajeEnEdicion }
            : validacion.datos,
        ),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo guardar el viaje.");
      }

      const viajeGuardadoServidor = {
        idViaje: resultado.viaje.id_viaje ?? idViajeEnEdicion,
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
        title: editando ? "¡Viaje actualizado!" : "¡Viaje publicado!",
        text: editando
          ? "Los cambios de tu viaje se guardaron correctamente."
          : "Tu viaje se ha guardado correctamente en la base de datos.",
        confirmButtonText: "Continuar",
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(({ isConfirmed }) => {
        if (isConfirmed) {
          setViajePublicado(viajeGuardadoServidor);
          viajeEnEdicionRef.current = null;
          setViajeEnEdicion(null);
        }
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

  function reintentarValidacionViajeEnCurso() {
    setEstadoViajeEnCurso("cargando");
    setIntentoViajeEnCurso((intento) => intento + 1);
  }

  /**
   * Restaura los valores del viaje publicado en el formulario.
   * @returns {void}
   */
  function editarViajePublicado() {
    if (!viajePublicado?.idViaje) {
      setErrorPublicacion("No se encontró el identificador del viaje para editarlo.");
      return;
    }

    viajeEnEdicionRef.current = viajePublicado.idViaje;
    setViajeEnEdicion(viajePublicado.idViaje);
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
    estadoViajeEnCurso,
    viajePublicado,
    editandoViaje: viajeEnEdicion !== null,
    cambiarCampoVehiculo,
    guardarVehiculo,
    publicarViaje,
    reintentarConsulta,
    reintentarValidacionViajeEnCurso,
    editarViajePublicado,
    aceptarPasajero,
  };
}
