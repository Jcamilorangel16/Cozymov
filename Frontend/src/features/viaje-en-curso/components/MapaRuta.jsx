"use client";

// Mapa con el trayecto y la ubicación actual del conductor.
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

// divIcon evita el problema de los íconos por defecto de Leaflet en Next.js.
const crearIcono = (clase, texto) =>
  L.divIcon({
    className: "",
    html: `<div class="mapa-pin ${clase}">${texto}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

/**
 * Dibuja la ruta, el origen, el destino y la posición del conductor.
 * @param {{coordenadas: object, origen: string, destino: string}} props Datos geográficos del viaje.
 * @returns Mapa interactivo.
 */
export default function MapaRuta({ coordenadas, origen, destino }) {
  const { trayecto, conductor } = coordenadas;

  return (
    <MapContainer
      bounds={trayecto}
      boundsOptions={{ padding: [40, 40] }}
      scrollWheelZoom
      className="mapa-ruta"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={trayecto} pathOptions={{ color: "#3a66a8", weight: 5 }} />

      <Marker position={coordenadas.origen} icon={crearIcono("pin-origen", "A")}>
        <Popup>{origen}</Popup>
      </Marker>
      <Marker position={coordenadas.destino} icon={crearIcono("pin-destino", "B")}>
        <Popup>{destino}</Popup>
      </Marker>
      <Marker position={conductor} icon={crearIcono("pin-conductor", "🚗")}>
        <Popup>Tu conductor está aquí</Popup>
      </Marker>
    </MapContainer>
  );
}