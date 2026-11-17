"use client";

// Mapa del viaje en curso: calcula la ruta origen → destino y sigue la posición del usuario.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import {
  buscarMapTiler,
  calcularRutaOsrm,
  distanciaMetros,
  indicePuntoCercano,
  obtenerRutaPrecargada,
} from "../../../lib/mapa";

const METROS_LLEGADA = 100;

// divIcon evita el problema de los íconos por defecto de Leaflet en Next.js.
const crearIcono = (clase, texto) =>
  L.divIcon({
    className: "",
    html: `<div class="mapa-pin ${clase}">${texto}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const iconoOrigen = crearIcono("pin-origen", "A");
const iconoDestino = crearIcono("pin-destino", "B");
const iconoUsuario = crearIcono("pin-conductor", "📍");

/** Mantiene el mapa centrado en la posición del usuario mientras el seguimiento está activo. */
function Seguimiento({ posicion, activo }) {
  const mapa = useMap();
  useEffect(() => {
    if (activo && posicion) mapa.panTo(posicion, { animate: true });
  }, [mapa, posicion, activo]);
  return null;
}

/** Ajusta el encuadre a toda la ruta cuando se calcula. */
function EncuadrarRuta({ trayecto, posicion }) {
  const mapa = useMap();
  const tieneUbicacion = posicion !== null;
  const posicionRef = useRef(posicion);
  useEffect(() => {
    posicionRef.current = posicion;
  });
  // Se reencuadra al calcular la ruta y la primera vez que llega la ubicación,
  // para que se vean la ruta completa y tu posición.
  useEffect(() => {
    const puntos = posicionRef.current ? [...trayecto, posicionRef.current] : trayecto;
    if (puntos.length > 1) mapa.fitBounds(puntos, { padding: [40, 40] });
  }, [mapa, trayecto, tieneUbicacion]);
  return null;
}

const formatearDistancia = (metros) =>
  metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${Math.round(metros)} m`;

/**
 * Calcula la ruta de la reserva (barrios de Valledupar) y la sigue hasta el destino.
 * @param {{origen: string, destino: string}} props
 * @returns Mapa interactivo con ruta y seguimiento de ubicación.
 */
export default function MapaRuta({ origen, destino }) {
  const [ruta, setRuta] = useState(null);
  const [error, setError] = useState("");
  const [posicion, setPosicion] = useState(null);
  const [avisoGps, setAvisoGps] = useState("");
  const [seguir, setSeguir] = useState(false);

  // 1. Usa la ruta precargada barrio ⇄ universidad; si no existe, geocodifica (MapTiler) y calcula (OSRM).
  useEffect(() => {
    const controlador = new AbortController();
    (async () => {
      try {
        const precargada = await obtenerRutaPrecargada(origen, destino, controlador.signal).catch(() => null);
        if (precargada) {
          setRuta(precargada);
          return;
        }

        const [lugaresOrigen, lugaresDestino] = await Promise.all([
          buscarMapTiler(origen, controlador.signal),
          buscarMapTiler(destino, controlador.signal),
        ]);
        if (!lugaresOrigen[0]) throw new Error(`No encontramos "${origen}" en Valledupar.`);
        if (!lugaresDestino[0]) throw new Error(`No encontramos "${destino}" en Valledupar.`);

        if (distanciaMetros(lugaresOrigen[0].coordenada, lugaresDestino[0].coordenada) < 50) {
          throw new Error(`No pudimos distinguir la ubicación de "${origen}" y "${destino}".`);
        }

        const calculada = await calcularRutaOsrm(
          lugaresOrigen[0].coordenada,
          lugaresDestino[0].coordenada,
          controlador.signal,
        );
        setRuta({
          ...calculada,
          origen: lugaresOrigen[0].coordenada,
          destino: lugaresDestino[0].coordenada,
        });
      } catch (errorRuta) {
        if (errorRuta.name !== "AbortError") {
          setError(errorRuta.message || "No se pudo calcular la ruta.");
        }
      }
    })();
    return () => controlador.abort();
  }, [origen, destino]);

  // 2. Sigue la ubicación del dispositivo.
  useEffect(() => {
    if (!navigator.geolocation) return undefined;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setAvisoGps("");
        setPosicion([coords.latitude, coords.longitude]);
      },
      () => setAvisoGps("Activa la ubicación para seguir tu recorrido en el mapa."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // 3. Avance sobre la ruta y detección de llegada.
  const progreso = useMemo(() => {
    if (!ruta || !posicion) return null;
    const indice = indicePuntoCercano(ruta.trayecto, posicion);
    return {
      recorrido: ruta.trayecto.slice(0, indice + 1),
      pendiente: ruta.trayecto.slice(indice),
      metrosAlDestino: distanciaMetros(posicion, ruta.destino),
    };
  }, [ruta, posicion]);

  const llego = progreso !== null && progreso.metrosAlDestino <= METROS_LLEGADA;

  if (error) {
    return (
      <div className="alert alert-warning" role="alert">
        No se pudo mostrar el mapa: {error}
      </div>
    );
  }
  if (!ruta) {
    return (
      <div className="mapa-ruta mapa-cargando" role="status">
        Calculando tu ruta...
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <span className="texto-secundario">
          Ruta: <strong>{formatearDistancia(ruta.distanciaMetros)}</strong> · aprox.{" "}
          <strong>{Math.max(1, Math.round(ruta.duracionSegundos / 60))} min</strong>
          {progreso && (
            <>
              {" "}· Faltan <strong>{formatearDistancia(progreso.metrosAlDestino)}</strong>
            </>
          )}
        </span>
        <button
          type="button"
          className={`btn btn-sm ${seguir ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setSeguir((actual) => !actual)}
          aria-pressed={seguir}
        >
          {seguir ? "Siguiendo mi ubicación" : "Seguir mi ubicación"}
        </button>
      </div>
      {llego && (
        <p className="alert alert-success py-2" role="status">
          Llegaste a tu destino. Ya puedes finalizar el viaje.
        </p>
      )}
      {avisoGps && <p className="small texto-secundario mb-2">{avisoGps}</p>}

      <MapContainer center={ruta.origen} zoom={14} scrollWheelZoom className="mapa-ruta">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <EncuadrarRuta trayecto={ruta.trayecto} posicion={posicion} />
        <Polyline
          positions={progreso ? progreso.pendiente : ruta.trayecto}
          pathOptions={{ color: "#3a66a8", weight: 5 }}
        />
        {progreso && (
          <Polyline positions={progreso.recorrido} pathOptions={{ color: "#9ca3af", weight: 5 }} />
        )}

        <Marker position={ruta.origen} icon={iconoOrigen}>
          <Popup>{origen}</Popup>
        </Marker>
        <Marker position={ruta.destino} icon={iconoDestino}>
          <Popup>{destino}</Popup>
        </Marker>
        {posicion && (
          <Marker position={posicion} icon={iconoUsuario}>
            <Popup>Tu ubicación</Popup>
          </Marker>
        )}
        <Seguimiento posicion={posicion} activo={seguir} />
      </MapContainer>
    </div>
  );
}
