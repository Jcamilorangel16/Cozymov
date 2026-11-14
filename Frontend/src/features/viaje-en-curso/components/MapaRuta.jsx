"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  buscarDireccionInversa,
  buscarMapTiler,
  calcularRutaOsrm,
  convertirEnSugerencia,
  obtenerNombreDireccion,
} from "../utils/mapa";

const API_KEY = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || "";
const CLAVE_CASA_GUARDADA = "cozymov-destino-casa";
const CIUDAD_INICIAL = {
  id: "valledupar-colombia",
  nombre: "Valledupar, Colombia",
  centro: [10.4651733, -73.2529512],
  limites: [
    [10.4221134, -73.2969431],
    [10.5021334, -73.2211251],
  ],
};
const DESTINO_UNIVERSIDAD = {
  nombre: "Universidad Popular del Cesar",
  coordenadas: [10.4491234, -73.2625229],
};
const iconoOrigen = L.divIcon({
  className: "",
  html: '<div class="mapa-pin pin-origen">A</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const iconoDestino = L.divIcon({
  className: "",
  html: '<div class="mapa-pin pin-destino">B</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function limitesValidos(limites) {
  if (
    Array.isArray(limites) &&
    limites.length === 2 &&
    limites.every(
      (esquina) =>
        Array.isArray(esquina) &&
        esquina.length === 2 &&
        esquina.every(Number.isFinite)
    ) &&
    limites[0][0] >= -90 &&
    limites[1][0] <= 90 &&
    limites[0][1] >= -180 &&
    limites[1][1] <= 180 &&
    limites[0][0] < limites[1][0] &&
    limites[0][1] < limites[1][1]
  ) {
    return true;
  }
  return false;
}

function validarCiudad(ciudad) {
  return (
    ciudad &&
    typeof ciudad.id === "string" &&
    typeof ciudad.nombre === "string" &&
    limitesValidos(ciudad.limites) &&
    Array.isArray(ciudad.centro) &&
    ciudad.centro.length === 2 &&
    ciudad.centro.every(Number.isFinite) &&
    ciudad.centro[0] >= ciudad.limites[0][0] &&
    ciudad.centro[0] <= ciudad.limites[1][0] &&
    ciudad.centro[1] >= ciudad.limites[0][1] &&
    ciudad.centro[1] <= ciudad.limites[1][1]
  );
}

function leerCasaGuardada() {
  if (typeof window === "undefined") return { casa: null, error: "" };

  try {
    const guardada = window.localStorage.getItem(CLAVE_CASA_GUARDADA);
    if (!guardada) return { casa: null, error: "" };

    const casa = JSON.parse(guardada);
    const coordenadas = casa?.coordenadas;
    if (
      typeof casa?.etiqueta !== "string" ||
      !Array.isArray(coordenadas) ||
      coordenadas.length !== 2 ||
      !coordenadas.every(Number.isFinite) ||
      !validarCiudad(casa.ciudad) ||
      !puntoDentroDeLimites(coordenadas, casa.ciudad.limites)
    ) {
      return { casa: null, error: "La ubicación de casa guardada no es válida." };
    }

    return { casa, error: "" };
  } catch {
    return { casa: null, error: "No se pudo leer la ubicación de casa en este navegador." };
  }
}

function puntoDentroDeLimites(punto, limites) {
  const [[sur, oeste], [norte, este]] = limites;
  return punto[0] >= sur && punto[0] <= norte && punto[1] >= oeste && punto[1] <= este;
}

function obtenerCiudad(feature) {
  const designacionCruda = feature?.properties?.place_designation;
  const designacion =
    typeof designacionCruda === "string" ? designacionCruda.toLowerCase() : "";
  const tipos = Array.isArray(feature?.place_type) ? feature.place_type : [];
  const esCiudad =
    ["city", "town", "village", "municipality"].includes(designacion) ||
    tipos.some((tipo) => ["place", "locality"].includes(tipo));
  const nombre = feature?.place_name || feature?.text;
  const centro = feature?.center;
  const bbox = feature?.bbox;

  if (
    !esCiudad ||
    typeof nombre !== "string" ||
    !Array.isArray(centro) ||
    centro.length < 2 ||
    !centro.every(Number.isFinite) ||
    !Array.isArray(bbox) ||
    bbox.length !== 4 ||
    !bbox.every(Number.isFinite)
  ) {
    return null;
  }

  const limites = [
    [bbox[1], bbox[0]],
    [bbox[3], bbox[2]],
  ];
  if (!limitesValidos(limites)) return null;

  const ciudad = {
    id: typeof feature.id === "string" ? feature.id : nombre,
    nombre,
    centro: [centro[1], centro[0]],
    limites,
  };
  return validarCiudad(ciudad) ? ciudad : null;
}

async function consultarMapTiler(
  texto,
  tipos,
  proximidad,
  signal,
  { limites = null, autocomplete = true } = {}
) {
  return buscarMapTiler(texto, {
    apiKey: API_KEY,
    tipos,
    proximidad,
    limites,
    signal,
    autocomplete,
  });
}

async function consultarDireccionInversa(punto, tipos, signal) {
  return buscarDireccionInversa(punto, tipos, API_KEY, signal);
}

function obtenerDireccion(feature, limites) {
  return convertirEnSugerencia(feature, limites);
}

async function consultarRuta(origen, destino, signal) {
  return calcularRutaOsrm(origen, destino, signal);
}

function SeleccionarPunto({ modo, onSeleccionar }) {
  useMapEvents({
    click(evento) {
      if (modo) {
        onSeleccionar([evento.latlng.lat, evento.latlng.lng]);
      }
    },
  });

  return null;
}

function AjustarVista({ ciudad, puntos }) {
  const mapa = useMap();

  useEffect(() => {
    mapa.setMaxBounds(ciudad.limites);
    mapa.fitBounds(ciudad.limites, { padding: [24, 24] });
    mapa.setMinZoom(mapa.getZoom());
  }, [mapa, ciudad]);

  useEffect(() => {
    if (puntos.length === 1) {
      mapa.setView(puntos[0], Math.max(mapa.getMinZoom(), 13));
    } else if (puntos.length > 1) {
      mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 13 });
    }
  }, [mapa, puntos]);

  return null;
}

function formatearDuracion(segundos) {
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas === 0) return `${minutos} min`;
  return minutosRestantes ? `${horas} h ${minutosRestantes} min` : `${horas} h`;
}

function MensajeMapa({ children, error = false }) {
  return (
    <div className="mapa-ruta mapa-cargando" role={error ? "alert" : "status"}>
      <p className="text-center texto-secundario m-0">{children}</p>
    </div>
  );
}

/**
 * Permite seleccionar origen y destino por búsqueda, GPS o mapa para buscar una ruta.
 */
export default function MapaRuta({ onRutaSeleccionada }) {
  const [ciudadActual, setCiudadActual] = useState(CIUDAD_INICIAL);
  const [ubicacionCasaInicial] = useState(() => leerCasaGuardada());
  const [casaGuardada, setCasaGuardada] = useState(ubicacionCasaInicial.casa);
  const [errorCasa, setErrorCasa] = useState(ubicacionCasaInicial.error);
  const [origen, setOrigen] = useState(null);
  const [origenEtiqueta, setOrigenEtiqueta] = useState("");
  const [origenConfirmado, setOrigenConfirmado] = useState(false);
  const [destino, setDestino] = useState(DESTINO_UNIVERSIDAD.coordenadas);
  const [destinoEtiqueta, setDestinoEtiqueta] = useState(DESTINO_UNIVERSIDAD.nombre);
  const [destinoConfirmado, setDestinoConfirmado] = useState(true);
  const [destinoPredefinido, setDestinoPredefinido] = useState("universidad");
  const [modoSeleccion, setModoSeleccion] = useState("origen");
  const [estadoRuta, setEstadoRuta] = useState(null);
  const [errorMapa, setErrorMapa] = useState("");
  const [errorSeleccion, setErrorSeleccion] = useState("");
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [busquedaCiudad, setBusquedaCiudad] = useState("");
  const [ciudadesEncontradas, setCiudadesEncontradas] = useState([]);
  const [buscandoCiudades, setBuscandoCiudades] = useState(false);
  const [errorCiudad, setErrorCiudad] = useState("");
  const [busquedaDireccion, setBusquedaDireccion] = useState("");
  const [direccionesEncontradas, setDireccionesEncontradas] = useState([]);
  const [buscandoDirecciones, setBuscandoDirecciones] = useState(false);
  const [errorDireccion, setErrorDireccion] = useState("");
  const [buscandoDireccionInversa, setBuscandoDireccionInversa] = useState(false);
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const controladorCiudad = useRef(null);
  const temporizadorCiudad = useRef(null);
  const controladorDireccion = useRef(null);
  const temporizadorDireccion = useRef(null);
  const controladorDireccionInversa = useRef(null);
  const controladorUbicacion = useRef(null);
  const intentoUbicacion = useRef(0);
  const modoSeleccionRef = useRef(modoSeleccion);
  modoSeleccionRef.current = modoSeleccion;
  const consultaActual = JSON.stringify([origen, destino, origenConfirmado, destinoConfirmado]);

  useEffect(
    () => () => {
      controladorCiudad.current?.abort();
      controladorDireccion.current?.abort();
      controladorDireccionInversa.current?.abort();
      controladorUbicacion.current?.abort();
      if (temporizadorCiudad.current) window.clearTimeout(temporizadorCiudad.current);
      if (temporizadorDireccion.current) window.clearTimeout(temporizadorDireccion.current);
      intentoUbicacion.current += 1;
      controladorCiudad.current = null;
      controladorDireccion.current = null;
      controladorDireccionInversa.current = null;
      controladorUbicacion.current = null;
    },
    []
  );

  useEffect(() => {
    if (!origen || !destino || !origenConfirmado || !destinoConfirmado) return undefined;

    const controlador = new AbortController();
    consultarRuta(origen, destino, controlador.signal)
      .then((ruta) => setEstadoRuta({ consulta: consultaActual, ruta, error: "" }))
      .catch((error) => {
        if (error.name !== "AbortError") {
          setEstadoRuta({
            consulta: consultaActual,
            ruta: null,
            error: error.message || "No se pudo calcular la ruta.",
          });
        }
      });

    return () => controlador.abort();
  }, [origen, destino, origenConfirmado, destinoConfirmado, consultaActual]);

  useEffect(() => {
    if (
      !origen ||
      !destino ||
      !origenConfirmado ||
      !destinoConfirmado ||
      buscandoUbicacion ||
      buscandoDireccionInversa ||
      !origenEtiqueta ||
      !destinoEtiqueta ||
      origenEtiqueta === "Buscando dirección…" ||
      destinoEtiqueta === "Buscando dirección…"
    ) {
      onRutaSeleccionada?.(null);
      return;
    }

    onRutaSeleccionada?.({ origen: origenEtiqueta, destino: destinoEtiqueta });
  }, [
    destino,
    destinoConfirmado,
    destinoEtiqueta,
    buscandoDireccionInversa,
    buscandoUbicacion,
    onRutaSeleccionada,
    origen,
    origenConfirmado,
    origenEtiqueta,
  ]);

  const resultadoActual =
    estadoRuta?.consulta === consultaActual ? estadoRuta : null;
  const puntosEncuadre = useMemo(() => {
    if (resultadoActual?.ruta) return resultadoActual.ruta.coordenadas;
    return [origen, destino].filter(Boolean);
  }, [origen, destino, resultadoActual]);

  async function buscarCiudades(texto) {
    const consulta = texto.trim();
    controladorCiudad.current?.abort();
    const controlador = new AbortController();
    controladorCiudad.current = controlador;
    setBuscandoCiudades(true);
    setErrorCiudad("");
    setCiudadesEncontradas([]);

    try {
      const features = await consultarMapTiler(consulta, "place,locality", null, controlador.signal);
      const ciudades = features.map(obtenerCiudad).filter(Boolean);
      if (!ciudades.length) {
        setErrorCiudad("No se encontraron ciudades.");
        return;
      }
      setCiudadesEncontradas(ciudades);
    } catch (error) {
      if (error.name !== "AbortError") {
        setErrorCiudad(error.message || "No se pudieron buscar ciudades.");
      }
    } finally {
      if (controladorCiudad.current === controlador) {
        controladorCiudad.current = null;
        setBuscandoCiudades(false);
      }
    }
  }

  function cambiarBusquedaCiudad(texto) {
    setBusquedaCiudad(texto);
    setErrorCiudad("");
    setCiudadesEncontradas([]);
    if (temporizadorCiudad.current) window.clearTimeout(temporizadorCiudad.current);
    controladorCiudad.current?.abort();

    if (texto.trim().length < 3) {
      setBuscandoCiudades(false);
      return;
    }

    temporizadorCiudad.current = window.setTimeout(() => {
      void buscarCiudades(texto);
    }, 300);
  }

  async function buscarDirecciones(texto) {
    const consulta = texto.trim();
    controladorDireccion.current?.abort();
    const controlador = new AbortController();
    controladorDireccion.current = controlador;
    setBuscandoDirecciones(true);
    setErrorDireccion("");
    setDireccionesEncontradas([]);

    try {
      const features = await consultarMapTiler(
        consulta,
        "address,street,poi,neighborhood,place,locality",
        ciudadActual.centro,
        controlador.signal,
        { limites: ciudadActual.limites }
      );
      const direcciones = features
        .map((feature) => obtenerDireccion(feature, ciudadActual.limites))
        .filter(Boolean);
      if (!direcciones.length) {
        setErrorDireccion("Sin coincidencias; marca el punto en el mapa.");
        return;
      }
      setDireccionesEncontradas(direcciones);
    } catch (error) {
      if (error.name !== "AbortError") {
        setErrorDireccion(error.message || "No se pudieron buscar direcciones.");
      }
    } finally {
      if (controladorDireccion.current === controlador) {
        controladorDireccion.current = null;
        setBuscandoDirecciones(false);
      }
    }
  }

  function cambiarBusquedaDireccion(texto) {
    setBusquedaDireccion(texto);
    if (modoSeleccion === "origen" && texto !== origenEtiqueta) {
      setOrigen(null);
      setOrigenEtiqueta("");
      setOrigenConfirmado(false);
    } else if (modoSeleccion === "destino" && texto !== destinoEtiqueta) {
      setDestino(null);
      setDestinoEtiqueta("");
      setDestinoConfirmado(false);
      setDestinoPredefinido("");
    }
    setErrorDireccion("");
    setDireccionesEncontradas([]);
    if (temporizadorDireccion.current) window.clearTimeout(temporizadorDireccion.current);
    controladorDireccion.current?.abort();

    if (texto.trim().length < 2) {
      setBuscandoDirecciones(false);
      return;
    }

    temporizadorDireccion.current = window.setTimeout(() => {
      void buscarDirecciones(texto);
    }, 300);
  }

  function cancelarSolicitudUbicacion() {
    intentoUbicacion.current += 1;
    controladorUbicacion.current?.abort();
    controladorUbicacion.current = null;
    setBuscandoUbicacion(false);
  }

  function seleccionarCiudad(ciudad) {
    cancelarSolicitudUbicacion();
    controladorCiudad.current?.abort();
    controladorDireccion.current?.abort();
    controladorDireccionInversa.current?.abort();
    if (temporizadorCiudad.current) window.clearTimeout(temporizadorCiudad.current);
    if (temporizadorDireccion.current) window.clearTimeout(temporizadorDireccion.current);
    setCiudadActual(ciudad);
    setOrigen(null);
    setOrigenEtiqueta("");
    setOrigenConfirmado(false);
    setDestino(null);
    setDestinoEtiqueta("");
    setDestinoConfirmado(false);
    setDestinoPredefinido("");
    setModoSeleccion("origen");
    setEstadoRuta(null);
    setErrorSeleccion("");
    setErrorUbicacion("");
    setCiudadesEncontradas([]);
    setBusquedaCiudad("");
    setDireccionesEncontradas([]);
    setBusquedaDireccion("");
    setMostrarAjustes(false);
  }

  function seleccionarDestinoUniversidad() {
    controladorDireccion.current?.abort();
    if (temporizadorDireccion.current) {
      window.clearTimeout(temporizadorDireccion.current);
      temporizadorDireccion.current = null;
    }
    setBuscandoDirecciones(false);
    setCiudadActual(CIUDAD_INICIAL);
    setDestino(DESTINO_UNIVERSIDAD.coordenadas);
    setDestinoEtiqueta(DESTINO_UNIVERSIDAD.nombre);
    setDestinoConfirmado(true);
    setDestinoPredefinido("universidad");
    setModoSeleccion("origen");
    setBusquedaDireccion("");
    setDireccionesEncontradas([]);
    setErrorDireccion("");
    setErrorCasa("");
  }

  function seleccionarDestinoCasa() {
    if (!casaGuardada) {
      setErrorCasa("Primero selecciona un punto y guárdalo como tu casa.");
      return;
    }

    controladorDireccion.current?.abort();
    if (temporizadorDireccion.current) {
      window.clearTimeout(temporizadorDireccion.current);
      temporizadorDireccion.current = null;
    }
    setBuscandoDirecciones(false);
    setCiudadActual(casaGuardada.ciudad);
    setDestino(casaGuardada.coordenadas);
    setDestinoEtiqueta(casaGuardada.etiqueta);
    setDestinoConfirmado(true);
    setDestinoPredefinido("casa");
    setModoSeleccion("origen");
    setBusquedaDireccion("");
    setDireccionesEncontradas([]);
    setErrorDireccion("");
    setErrorCasa("");
  }

  function guardarDestinoComoCasa() {
    if (!destino || !destinoConfirmado) {
      setErrorCasa("Selecciona y confirma primero la ubicación que quieres guardar como casa.");
      return;
    }

    const casa = {
      coordenadas: destino,
      etiqueta: destinoEtiqueta || "Casa",
      ciudad: ciudadActual,
    };
    try {
      window.localStorage.setItem(CLAVE_CASA_GUARDADA, JSON.stringify(casa));
      setCasaGuardada(casa);
      setDestinoPredefinido("casa");
      setErrorCasa("");
    } catch {
      setErrorCasa("No se pudo guardar la ubicación en este navegador.");
    }
  }

  function puntoDentroDeCiudad(punto) {
    return puntoDentroDeLimites(punto, ciudadActual.limites);
  }

  async function actualizarDireccionDelPunto(punto, tipo) {
    controladorDireccionInversa.current?.abort();
    const controlador = new AbortController();
    controladorDireccionInversa.current = controlador;
    setBuscandoDireccionInversa(true);
    setErrorDireccion("");

    try {
      const features = await consultarDireccionInversa(
        punto,
        "address,street,poi,neighborhood,place,locality",
        controlador.signal
      );
      if (controladorDireccionInversa.current !== controlador) return;

      const direccion = features.map(obtenerNombreDireccion).find(Boolean);
      const etiqueta = direccion || "Punto elegido en el mapa";
      if (tipo === "origen") {
        setOrigenEtiqueta(etiqueta);
      } else {
        setDestinoEtiqueta(etiqueta);
      }
      if (modoSeleccionRef.current === tipo) setBusquedaDireccion(etiqueta);
      if (!direccion) {
        setErrorDireccion("Dirección no encontrada; confirma el punto en el mapa.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setErrorDireccion(error.message || "No se pudo identificar la dirección del punto.");
      }
    } finally {
      if (controladorDireccionInversa.current === controlador) {
        controladorDireccionInversa.current = null;
        setBuscandoDireccionInversa(false);
      }
    }
  }

  async function establecerUbicacionActualComoOrigen(punto, intento) {
    const controlador = new AbortController();
    controladorUbicacion.current = controlador;

    try {
      const [direccionesResult, ciudadesResult] = await Promise.allSettled([
        consultarDireccionInversa(
          punto,
          "address,street,poi,neighborhood,place,locality",
          controlador.signal
        ),
        consultarDireccionInversa(punto, "place,locality", controlador.signal),
      ]);
      if (intento !== intentoUbicacion.current) return;

      const direcciones =
        direccionesResult.status === "fulfilled" ? direccionesResult.value : [];
      const featuresCiudad =
        ciudadesResult.status === "fulfilled"
          ? ciudadesResult.value
          : [];
      const cambiarCiudad = !puntoDentroDeCiudad(punto);
      let ciudadDetectada =
        featuresCiudad
          .map(obtenerCiudad)
          .find((ciudad) => ciudad && puntoDentroDeLimites(punto, ciudad.limites)) ?? null;

      if (cambiarCiudad && !ciudadDetectada) {
        const featureCiudad =
          featuresCiudad.find((feature) => {
            const designacion = feature?.properties?.place_designation;
            return ["city", "town", "village", "municipality"].includes(
              typeof designacion === "string" ? designacion.toLowerCase() : ""
            );
          }) ??
          featuresCiudad.find((feature) =>
            Array.isArray(feature?.place_type) &&
            feature.place_type.some((tipo) => ["place", "locality"].includes(tipo))
          );
        const nombreCiudad = featureCiudad?.text;
        if (nombreCiudad) {
          const coincidencias = await consultarMapTiler(
            nombreCiudad,
            "place,locality",
            punto,
            controlador.signal
          );
          if (intento !== intentoUbicacion.current) return;
          ciudadDetectada =
            coincidencias
              .map(obtenerCiudad)
              .find((ciudad) => ciudad && puntoDentroDeLimites(punto, ciudad.limites)) ?? null;
        }
      }

      if (cambiarCiudad && !ciudadDetectada) {
        setErrorUbicacion(
          "No se pudo identificar una ciudad colombiana para tu ubicación. Cambia la ciudad del mapa e inténtalo de nuevo."
        );
        return;
      }

      if (cambiarCiudad && ciudadDetectada) {
        controladorDireccion.current?.abort();
        if (temporizadorDireccion.current) {
          window.clearTimeout(temporizadorDireccion.current);
          temporizadorDireccion.current = null;
        }
        setCiudadActual(ciudadDetectada);
        setDestino(null);
        setDestinoEtiqueta("");
        setDestinoConfirmado(false);
        setDestinoPredefinido("");
        setEstadoRuta(null);
        setErrorSeleccion("");
        setBusquedaCiudad("");
        setCiudadesEncontradas([]);
        setBusquedaDireccion("");
        setDireccionesEncontradas([]);
        setBuscandoDirecciones(false);
      }

      const direccion = direcciones[0]?.place_name || direcciones[0]?.text || "";
      setOrigen(punto);
      setOrigenEtiqueta(direccion || "Mi ubicación actual");
      setOrigenConfirmado(true);
      setBusquedaDireccion("");
      setModoSeleccion("destino");
      setErrorSeleccion("");
      setErrorUbicacion(
        direccion
          ? ""
          : "GPS seleccionado; puedes ajustar el punto en el mapa."
      );
    } catch (error) {
      if (error.name !== "AbortError" && intento === intentoUbicacion.current) {
        setErrorUbicacion(error.message || "No se pudo identificar tu ubicación actual.");
      }
    } finally {
      if (intento === intentoUbicacion.current) {
        controladorUbicacion.current = null;
        setBuscandoUbicacion(false);
      }
    }
  }

  function usarUbicacionActual() {
    if (!navigator.geolocation) {
      setErrorUbicacion("GPS no disponible; marca el origen en el mapa.");
      return;
    }

    const intento = intentoUbicacion.current + 1;
    intentoUbicacion.current = intento;
    setBuscandoUbicacion(true);
    setErrorUbicacion("");
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        if (intento !== intentoUbicacion.current) return;
        const punto = [posicion.coords.latitude, posicion.coords.longitude];
        if (!punto.every(Number.isFinite)) {
          setBuscandoUbicacion(false);
          setErrorUbicacion("La ubicación no es válida; marca el origen en el mapa.");
          return;
        }
        void establecerUbicacionActualComoOrigen(punto, intento);
      },
      (error) => {
        if (intento !== intentoUbicacion.current) return;
        setBuscandoUbicacion(false);
        setErrorUbicacion(
          error.code === 1
            ? "Permite el acceso al GPS o marca el origen en el mapa."
            : error.code === 3
              ? "El GPS tardó demasiado; inténtalo otra vez o marca el origen."
              : "No se pudo obtener el GPS; marca el origen en el mapa."
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  function seleccionarDireccion(direccion) {
    if (!modoSeleccion) {
      setErrorDireccion("Primero elige si esta dirección será el origen o el destino.");
      return;
    }
    if (!puntoDentroDeCiudad(direccion.coordenadas)) {
      setErrorDireccion(`La dirección no está dentro del área de ${ciudadActual.nombre}.`);
      return;
    }

    seleccionarPunto(direccion.coordenadas, direccion.nombre);
    setBusquedaDireccion(direccion.nombre);
    setDireccionesEncontradas([]);
    setErrorDireccion("");
  }

  function activarCampo(tipo) {
    if (modoSeleccion === tipo) return;
    controladorDireccion.current?.abort();
    if (temporizadorDireccion.current) {
      window.clearTimeout(temporizadorDireccion.current);
      temporizadorDireccion.current = null;
    }
    setBuscandoDirecciones(false);
    setDireccionesEncontradas([]);
    setErrorDireccion("");
    setModoSeleccion(tipo);
    setBusquedaDireccion(tipo === "origen" ? origenEtiqueta : destinoEtiqueta);
  }

  if (!API_KEY) {
    return <MensajeMapa error>Falta configurar NEXT_PUBLIC_MAPTILER_API_KEY para mostrar el mapa.</MensajeMapa>;
  }

  function seleccionarPunto(punto, etiqueta = "", tipo = modoSeleccion) {
    if (!puntoDentroDeCiudad(punto)) {
      setErrorSeleccion(`Selecciona un punto dentro del área de ${ciudadActual.nombre}.`);
      return;
    }

    cancelarSolicitudUbicacion();
    controladorDireccionInversa.current?.abort();
    setBuscandoDireccionInversa(false);
    setErrorSeleccion("");
    if (tipo === "origen") {
      setOrigen(punto);
      setOrigenEtiqueta(etiqueta || "Buscando dirección…");
      setOrigenConfirmado(false);
      setModoSeleccion("origen");
      if (etiqueta) setBusquedaDireccion(etiqueta);
    } else if (tipo === "destino") {
      setDestino(punto);
      setDestinoEtiqueta(etiqueta || "Buscando dirección…");
      setDestinoConfirmado(false);
      setDestinoPredefinido("");
      setModoSeleccion("destino");
      if (etiqueta) setBusquedaDireccion(etiqueta);
    }
    if (!etiqueta && (tipo === "origen" || tipo === "destino")) {
      void actualizarDireccionDelPunto(punto, tipo);
    }
  }

  function moverMarcador(tipo, evento) {
    const punto = [evento.target.getLatLng().lat, evento.target.getLatLng().lng];
    setModoSeleccion(tipo);
    seleccionarPunto(punto, "", tipo);
  }

  function confirmarUbicacion(tipo) {
    if (tipo === "origen" && origen) setOrigenConfirmado(true);
    if (tipo === "destino" && destino) setDestinoConfirmado(true);
  }

  function intercambiarUbicaciones() {
    controladorDireccion.current?.abort();
    controladorDireccionInversa.current?.abort();
    if (temporizadorDireccion.current) {
      window.clearTimeout(temporizadorDireccion.current);
      temporizadorDireccion.current = null;
    }
    setBuscandoDirecciones(false);
    setBuscandoDireccionInversa(false);
    setOrigen(destino);
    setOrigenEtiqueta(destinoEtiqueta);
    setOrigenConfirmado(destinoConfirmado);
    setDestino(origen);
    setDestinoEtiqueta(origenEtiqueta);
    setDestinoConfirmado(origenConfirmado);
    setDestinoPredefinido("");
    setBusquedaDireccion("");
    setDireccionesEncontradas([]);
    setErrorDireccion("");
    setModoSeleccion("origen");
  }

  function reiniciarSeleccion() {
    cancelarSolicitudUbicacion();
    controladorDireccion.current?.abort();
    controladorDireccionInversa.current?.abort();
    if (temporizadorDireccion.current) {
      window.clearTimeout(temporizadorDireccion.current);
      temporizadorDireccion.current = null;
    }
    setBuscandoDirecciones(false);
    setBuscandoDireccionInversa(false);
    setOrigen(null);
    setOrigenEtiqueta("");
    setOrigenConfirmado(false);
    setDestino(null);
    setDestinoEtiqueta("");
    setDestinoConfirmado(false);
    setDestinoPredefinido("");
    setModoSeleccion("origen");
    setEstadoRuta(null);
    setErrorUbicacion("");
    setBusquedaDireccion("");
    setDireccionesEncontradas([]);
    setErrorDireccion("");
  }

  const clave = encodeURIComponent(API_KEY);

  return (
    <div className="ruta-mapa-contenedor">
      <section className="mapa-seleccion" aria-label="Selección manual de ubicaciones">
        <div className="mapa-seleccion-encabezado">
          <div>
            <span className="texto-secundario small">Ciudad del mapa: {ciudadActual.nombre}</span>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary mapa-ajustes-boton"
            aria-label="Cambiar ciudad del mapa"
            aria-expanded={mostrarAjustes}
            aria-controls="ajustes-ciudad-mapa"
            title="Cambiar ciudad del mapa"
            onClick={() => setMostrarAjustes((visible) => !visible)}
          >
            <span aria-hidden="true">⚙</span>
          </button>
        </div>

        {mostrarAjustes && (
          <section className="mapa-ciudad-ajustes" id="ajustes-ciudad-mapa" aria-label="Ajustes de ciudad del mapa">
            <p className="mb-2">
              Busca una ciudad de Colombia.
            </p>
            <form
              className="mapa-ciudad-form"
              onSubmit={(evento) => {
                evento.preventDefault();
                if (temporizadorCiudad.current) window.clearTimeout(temporizadorCiudad.current);
                if (busquedaCiudad.trim().length < 3) {
                  setErrorCiudad("Escribe al menos tres caracteres para buscar una ciudad.");
                } else {
                  void buscarCiudades(busquedaCiudad);
                }
              }}
            >
              <label className="visually-hidden" htmlFor="buscar-ciudad-mapa">Ciudad y país</label>
              <input
                id="buscar-ciudad-mapa"
                className="form-control"
                type="search"
                value={busquedaCiudad}
                autoComplete="off"
                placeholder="Ej.: Santa Marta, Colombia"
                onChange={(evento) => cambiarBusquedaCiudad(evento.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={buscandoCiudades || busquedaCiudad.trim().length < 3}
              >
                {buscandoCiudades ? "Buscando…" : "Buscar"}
              </button>
            </form>
            <p className="small text-muted mt-2 mb-0">
              Autocompletado limitado a ciudades de Colombia.
            </p>
            {buscandoCiudades && <p className="small mt-2 mb-0" role="status">Buscando ciudades…</p>}
            {errorCiudad && <p className="small text-danger mt-2 mb-0" role="alert">{errorCiudad}</p>}
            {ciudadesEncontradas.length > 0 && (
              <ul className="mapa-ciudad-resultados list-unstyled mt-2 mb-0" aria-label="Resultados de ciudades">
                {ciudadesEncontradas.map((ciudad) => (
                  <li key={`${ciudad.id}-${ciudad.nombre}`}>
                    <button
                      type="button"
                      className="btn btn-link p-1"
                      onClick={() => seleccionarCiudad(ciudad)}
                    >
                      {ciudad.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="mapa-formulario-ruta">
          <div className="mapa-campos-ruta">
            <div className="mapa-campo-ubicacion">
              <label htmlFor="buscar-origen-mapa" className="form-label mb-1">Origen</label>
              <input
                id="buscar-origen-mapa"
                className="form-control"
                type="search"
                value={modoSeleccion === "origen" ? busquedaDireccion : origenEtiqueta}
                autoComplete="off"
                placeholder="¿Desde dónde sales?"
                aria-controls={modoSeleccion === "origen" ? "sugerencias-direccion-mapa" : undefined}
                onFocus={() => activarCampo("origen")}
                onChange={(evento) => cambiarBusquedaDireccion(evento.target.value)}
              />
              {origen && (
                <div className="mapa-confirmacion-ubicacion">
                  <button
                    type="button"
                    className={`btn btn-sm ${origenConfirmado ? "btn-success" : "btn-outline-primary"}`}
                    onClick={() => confirmarUbicacion("origen")}
                  >
                    {origenConfirmado ? "Origen confirmado" : "Confirmar origen"}
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary mapa-intercambiar"
              aria-label="Intercambiar origen y destino"
              title="Intercambiar origen y destino"
              onClick={intercambiarUbicaciones}
            >
              ↕
            </button>
            <div className="mapa-campo-ubicacion">
              <label htmlFor="buscar-destino-mapa" className="form-label mb-1">Destino</label>
              <div className="mapa-destinos-rapidos" role="group" aria-label="Destinos guardados">
                <button
                  type="button"
                  className={`btn btn-sm ${destinoPredefinido === "universidad" ? "btn-primary" : "btn-outline-primary"}`}
                  aria-pressed={destinoPredefinido === "universidad"}
                  onClick={seleccionarDestinoUniversidad}
                >
                  Universidad Popular del Cesar
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${destinoPredefinido === "casa" ? "btn-primary" : "btn-outline-primary"}`}
                  aria-pressed={destinoPredefinido === "casa"}
                  disabled={!casaGuardada}
                  onClick={seleccionarDestinoCasa}
                >
                  Casa
                </button>
              </div>
              <input
                id="buscar-destino-mapa"
                className="form-control"
                type="search"
                value={modoSeleccion === "destino" ? busquedaDireccion : destinoEtiqueta}
                autoComplete="off"
                placeholder="¿A dónde vas?"
                aria-controls={modoSeleccion === "destino" ? "sugerencias-direccion-mapa" : undefined}
                onFocus={() => activarCampo("destino")}
                onChange={(evento) => cambiarBusquedaDireccion(evento.target.value)}
              />
              {destino && (
                <div className="mapa-confirmacion-ubicacion">
                  <button
                    type="button"
                    className={`btn btn-sm ${destinoConfirmado ? "btn-success" : "btn-outline-primary"}`}
                    onClick={() => confirmarUbicacion("destino")}
                  >
                    {destinoConfirmado ? "Destino confirmado" : "Confirmar destino"}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="mapa-acciones-ubicacion">
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={usarUbicacionActual}
              disabled={buscandoUbicacion}
            >
              {buscandoUbicacion ? "Obteniendo ubicación…" : "Usar mi ubicación actual"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={guardarDestinoComoCasa}
              disabled={!destino || !destinoConfirmado}
            >
              Guardar destino como casa
            </button>
            <button type="button" className="btn btn-link" onClick={reiniciarSeleccion}>
              Borrar selección
            </button>
          </div>
          {errorCasa && <p className="small text-danger mb-0" role="alert">{errorCasa}</p>}
          {buscandoUbicacion && (
            <p className="small mb-0" role="status">Obteniendo e identificando tu ubicación…</p>
          )}
          {buscandoDireccionInversa && (
            <p className="small mb-0" role="status">Actualizando la dirección del punto…</p>
          )}
          {buscandoDirecciones && (
            <p className="small mb-0" role="status">Buscando sugerencias…</p>
          )}
          {errorDireccion && <p className="small text-danger mb-0" role="alert">{errorDireccion}</p>}
          {errorUbicacion && <p className="small text-danger mb-0" role="alert">{errorUbicacion}</p>}
          {direccionesEncontradas.length > 0 && (
            <ul
              className="mapa-ciudad-resultados list-unstyled mb-0"
              id="sugerencias-direccion-mapa"
              aria-label={`Sugerencias para el ${modoSeleccion}`}
            >
              {direccionesEncontradas.map((direccion) => (
                <li key={`${direccion.id}-${direccion.nombre}`}>
                  <button
                    type="button"
                    className="btn btn-link p-2"
                    onClick={() => seleccionarDireccion(direccion)}
                  >
                    {direccion.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <MapContainer
        center={ciudadActual.centro}
        zoom={13}
        minZoom={5}
        maxBounds={ciudadActual.limites}
        maxBoundsViscosity={1}
        scrollWheelZoom
        className="mapa-ruta"
        aria-label={`Mapa limitado al área de ${ciudadActual.nombre} para seleccionar origen y destino`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url={`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${clave}`}
          eventHandlers={{
            tileerror: () => setErrorMapa("No se pudieron cargar los mosaicos del mapa de MapTiler."),
          }}
        />
        <SeleccionarPunto modo={modoSeleccion} onSeleccionar={seleccionarPunto} />
        <AjustarVista ciudad={ciudadActual} puntos={puntosEncuadre} />
        {origen && (
          <Marker
            position={origen}
            icon={iconoOrigen}
            draggable
            eventHandlers={{ dragend: (evento) => moverMarcador("origen", evento) }}
          >
            <Popup>{origenEtiqueta || "Origen seleccionado manualmente"}</Popup>
          </Marker>
        )}
        {destino && (
          <Marker
            position={destino}
            icon={iconoDestino}
            draggable
            eventHandlers={{ dragend: (evento) => moverMarcador("destino", evento) }}
          >
            <Popup>{destinoEtiqueta || "Destino seleccionado manualmente"}</Popup>
          </Marker>
        )}
        {resultadoActual?.ruta && (
          <Polyline
            positions={resultadoActual.ruta.coordenadas}
            pathOptions={{ color: "#3a66a8", weight: 5 }}
          />
        )}
      </MapContainer>

      {errorSeleccion && <p className="small text-danger mt-2 mb-0" role="alert">{errorSeleccion}</p>}
      {errorMapa && <p className="alert alert-danger mt-2 mb-0" role="alert">{errorMapa}</p>}
      {resultadoActual?.error ? (
        <p className="alert alert-danger mt-2 mb-0" role="alert">{resultadoActual.error}</p>
      ) : origen && destino && resultadoActual?.ruta ? (
        <div className="ruta-info-resumen mt-2" aria-label="Resumen estimado de la ruta">
          <span className="ruta-info-badge">
            📍 {(resultadoActual.ruta.distancia / 1000).toFixed(1)} km
          </span>
          <span className="ruta-info-badge">
            🕐 {formatearDuracion(resultadoActual.ruta.duracion)}
          </span>
          <span className="texto-secundario small align-self-center">
            Ruta estimada por OSRM; el mapa no es seguimiento en tiempo real.
          </span>
        </div>
      ) : origen && destino && (!origenConfirmado || !destinoConfirmado) ? (
        <p className="text-center texto-secundario mt-2 mb-0" role="status">
          Confirma el origen y el destino para calcular la ruta.
        </p>
      ) : origen && destino ? (
        <p className="text-center texto-secundario mt-2 mb-0" role="status">
          Calculando la ruta entre los puntos seleccionados…
        </p>
      ) : null}
    </div>
  );
}
