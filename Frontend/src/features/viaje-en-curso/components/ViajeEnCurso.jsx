"use client";

// Muestra el viaje activo: mapa, conductor, acceso a mensajes y datos de la ruta.
import dynamic from "next/dynamic";
import { viajeEnCursoEjemplo } from "../constants/viajeEnCurso";
import "../styles/viaje-en-curso.css";

// Leaflet usa `window`, por eso se carga solo en el navegador.
const MapaRuta = dynamic(() => import("./MapaRuta"), {
  ssr: false,
  loading: () => <div className="mapa-ruta mapa-cargando">Cargando mapa...</div>,
});

/**
 * Presenta el seguimiento del viaje reservado.
 * @param {{viaje?: object, onNavigate: (id: string) => void, onMensajeConductor?: (id: string) => void}} props
 * @returns Vista de viaje en curso o estado vacío.
 */
export default function ViajeEnCurso({
  viaje = viajeEnCursoEjemplo,
  onNavigate,
  onMensajeConductor,
}) {
  if (!viaje) {
    return (
      <div className="text-center py-5">
        <h4 className="letra-contenido">No tienes un viaje en curso</h4>
        <p className="texto-secundario">Cuando reserves un viaje, podrás seguirlo aquí.</p>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate("buscar")}>
          Buscar viaje
        </button>
      </div>
    );
  }

  const { conductor, ruta, coordenadas } = viaje;

  const escribirAlConductor = () => {
    onMensajeConductor?.(conductor.id);
    onNavigate("mensajes");
  };

  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="d-flex align-items-center gap-2 mb-3">
          <h3 className="mb-0 letra-contenido">Tu viaje en curso</h3>
          <span className="estado-viaje">Conductor en camino</span>
        </div>
        <MapaRuta coordenadas={coordenadas} origen={ruta.origen} destino={ruta.destino} />
      </div>

      <div className="col-lg-4 d-flex flex-column gap-3">
        <section className="panel-lateral">
          <h5 className="letra-contenido fw-bold mb-3">Tu conductor</h5>
          <div className="d-flex align-items-center gap-3">
            <div className="conductor-avatar" aria-hidden="true">
              {conductor.nombre.charAt(0)}
            </div>
            <div>
              <div className="fw-semibold letra-contenido">{conductor.nombre}</div>
              <small className="texto-secundario">
                ⭐ {conductor.calificacion} · {conductor.viajesRealizados} viajes
              </small>
            </div>
          </div>

          <dl className="datos-viaje mt-3 mb-3">
            <dt>Vehículo</dt>
            <dd>{conductor.vehiculo}</dd>
            <dt>Placa</dt>
            <dd><span className="placa">{conductor.placa}</span></dd>
          </dl>

          <button type="button" className="btn btn-primary w-100" onClick={escribirAlConductor}>
            💬 Enviar mensaje
          </button>
        </section>

        <section className="panel-lateral">
          <h5 className="letra-contenido fw-bold mb-3">Datos de la ruta</h5>
          <dl className="datos-viaje mb-0">
            <dt>Origen</dt>
            <dd>{ruta.origen}</dd>
            <dt>Destino</dt>
            <dd>{ruta.destino}</dd>
            <dt>Punto de encuentro</dt>
            <dd>{ruta.puntoEncuentro}</dd>
            <dt>Salida</dt>
            <dd>{ruta.salida}</dd>
            <dt>Llegada estimada</dt>
            <dd>{ruta.llegadaEstimada}</dd>
            <dt>Distancia</dt>
            <dd>{ruta.distancia} · {ruta.duracion}</dd>
            <dt>Precio</dt>
            <dd>{ruta.precio}</dd>
          </dl>
        </section>
      </div>
    </div>
  );
}