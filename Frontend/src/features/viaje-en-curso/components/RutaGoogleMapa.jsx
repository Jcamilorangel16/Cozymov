"use client";

import { useCallback, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/* ── Centro por defecto (Colombia) ────────────────────────────────── */
const CENTRO_DEFECTO = { lat: 4.6, lng: -74.08 };
const ZOOM_DEFECTO = 6;

/* ── Estados del componente ───────────────────────────────────────── */
const ESTADO = {
  CARGANDO: "cargando",
  LISTO: "listo",
  ERROR: "error",
  SIN_CLAVE: "sin_clave",
};

/** Calcula el estado inicial sin usar un efecto. */
function estadoInicial(origen, destino) {
  if (!API_KEY) return ESTADO.SIN_CLAVE;
  if (!origen || !destino) return ESTADO.ERROR;
  return ESTADO.CARGANDO;
}

/* ══════════════════════════════════════════════════════════════════════
   Componente interno: solicita la ruta y la dibuja sobre el mapa
   ══════════════════════════════════════════════════════════════════════ */
function DireccionesRuta({ origen, destino, onResultado, onError }) {
  const mapa = useMap();
  const routesLib = useMapsLibrary("routes");
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!routesLib || !mapa) return;

    const servicio = new routesLib.DirectionsService();
    const renderer = new routesLib.DirectionsRenderer({
      map: mapa,
      suppressMarkers: true, // Marcadores propios
      polylineOptions: {
        strokeColor: "#3a66a8",
        strokeOpacity: 0.85,
        strokeWeight: 5,
      },
    });
    rendererRef.current = renderer;

    servicio.route(
      {
        origin: origen,
        destination: destino,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (resultado, estado) => {
        if (estado === google.maps.DirectionsStatus.OK && resultado) {
          renderer.setDirections(resultado);

          const tramo = resultado.routes[0]?.legs[0];
          if (tramo) {
            onResultado({
              distancia: tramo.distance?.text ?? "",
              duracion: tramo.duration?.text ?? "",
              origenCoord: tramo.start_location,
              destinoCoord: tramo.end_location,
            });

            // fitBounds con padding
            const limites = new google.maps.LatLngBounds();
            tramo.steps.forEach((paso) => {
              limites.extend(paso.start_location);
              limites.extend(paso.end_location);
            });
            mapa.fitBounds(limites, { top: 50, right: 50, bottom: 50, left: 50 });
          }
        } else {
          onError(
            `No se pudo trazar la ruta entre "${origen}" y "${destino}". ` +
              "Verifica que los nombres de las ubicaciones sean correctos."
          );
        }
      }
    );

    return () => {
      renderer.setMap(null);
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routesLib, mapa, origen, destino]);

  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Componente interno: marcadores personalizados (A, B y conductor)
   ══════════════════════════════════════════════════════════════════════ */
function Marcadores({ origenCoord, destinoCoord, posicionActual }) {
  const mapa = useMap();
  const markerLib = useMapsLibrary("marker");
  const markersRef = useRef([]);

  useEffect(() => {
    if (!markerLib || !mapa) return;

    // Limpiar marcadores previos
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    const crearMarcador = (posicion, titulo, color, texto) => {
      const pinElement = new markerLib.PinElement({
        background: color,
        borderColor: "#fff",
        glyphColor: "#fff",
        glyph: texto,
        scale: 1.2,
      });

      const marker = new markerLib.AdvancedMarkerElement({
        map: mapa,
        position: posicion,
        title: titulo,
        content: pinElement.element,
      });

      markersRef.current.push(marker);
      return marker;
    };

    if (origenCoord) {
      crearMarcador(origenCoord, "Origen", "#3a66a8", "A");
    }
    if (destinoCoord) {
      crearMarcador(destinoCoord, "Destino", "#dc2626", "B");
    }
    if (posicionActual) {
      crearMarcador(
        { lat: posicionActual.lat, lng: posicionActual.lng },
        "Tu conductor",
        "#16a34a",
        "🚗"
      );
    }

    return () => {
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
  }, [markerLib, mapa, origenCoord, destinoCoord, posicionActual]);

  return null;
}

/* ══════════════════════════════════════════════════════════════════════
   Componente público: RutaGoogleMapa
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Mapa de Google Maps que traza la ruta entre origen y destino.
 *
 * @param {{
 *   origen: string,
 *   destino: string,
 *   posicionActual?: { lat: number, lng: number } | null
 * }} props
 */
export default function RutaGoogleMapa({ origen, destino, posicionActual = null }) {
  const [estado, setEstado] = useState(() => estadoInicial(origen, destino));
  const [mensajeError, setMensajeError] = useState(
    !origen || !destino ? "No hay datos de origen o destino para mostrar la ruta." : ""
  );
  const [info, setInfo] = useState(null); // { distancia, duracion, origenCoord, destinoCoord }

  const handleResultado = useCallback((datos) => {
    setInfo(datos);
    setEstado(ESTADO.LISTO);
  }, []);

  const handleError = useCallback((msg) => {
    setMensajeError(msg);
    setEstado(ESTADO.ERROR);
  }, []);

  /* ── Sin clave configurada ───────────────────────────────────────── */
  if (estado === ESTADO.SIN_CLAVE) {
    return (
      <div className="mapa-ruta mapa-cargando" role="status">
        <p className="text-center texto-secundario m-0">
          El mapa no está disponible.
          <br />
          <small>Falta configurar la clave de Google Maps.</small>
        </p>
      </div>
    );
  }

  /* ── Error de ruta o datos insuficientes ──────────────────────────── */
  if (estado === ESTADO.ERROR) {
    return (
      <div className="mapa-ruta mapa-cargando" role="alert">
        <p className="text-center texto-secundario m-0">
          {mensajeError || "No se pudo cargar el mapa."}
        </p>
      </div>
    );
  }

  return (
    <div className="ruta-google-mapa-contenedor">
      <APIProvider apiKey={API_KEY}>
        <Map
          className="mapa-ruta"
          defaultCenter={CENTRO_DEFECTO}
          defaultZoom={ZOOM_DEFECTO}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapId="ruta-viaje-en-curso"
        >
          <DireccionesRuta
            origen={origen}
            destino={destino}
            onResultado={handleResultado}
            onError={handleError}
          />
          <Marcadores
            origenCoord={info?.origenCoord ?? null}
            destinoCoord={info?.destinoCoord ?? null}
            posicionActual={posicionActual}
          />
        </Map>
      </APIProvider>

      {/* ── Indicador de carga ─────────────────────────────────────── */}
      {estado === ESTADO.CARGANDO && (
        <p className="text-center texto-secundario mt-2 mb-0" role="status">
          Cargando mapa y ruta…
        </p>
      )}

      {/* ── Info de distancia y duración ───────────────────────────── */}
      {estado === ESTADO.LISTO && info && (info.distancia || info.duracion) && (
        <div className="ruta-info-resumen mt-2" aria-label="Resumen de la ruta">
          {info.distancia && (
            <span className="ruta-info-badge">
              📍 {info.distancia}
            </span>
          )}
          {info.duracion && (
            <span className="ruta-info-badge">
              🕐 {info.duracion}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
