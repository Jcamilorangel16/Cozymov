// Atajos del inicio hacia las secciones principales.

const ACCIONES = [
  { id: "buscar", titulo: "Buscar viaje", detalle: "Encuentra quién va a tu destino", icono: "bi-search-heart-fill", tono: "celeste" },
  { id: "ofrecer", titulo: "Ofrecer viaje", detalle: "Comparte tu ruta y gana", icono: "bi-car-front-fill", tono: "verde" },
  { id: "mensajes", titulo: "Mensajes", detalle: "Habla con tus compañeros", icono: "bi-chat-dots-fill", tono: "rosa" },
  { id: "en-curso", titulo: "Viaje en curso", detalle: "Mira tu viaje actual", icono: "bi-signpost-split-fill", tono: "ambar" },
];

/**
 * Fila de tarjetas con acceso rápido a otras vistas.
 * @param {{onNavigate: (id: string) => void}} props Acción de navegación.
 * @returns Tarjetas de acción rápida.
 */
export default function AccionesRapidasInicio({ onNavigate }) {
  return (
    <section className="acciones-rapidas" aria-label="Accesos rápidos">
      {ACCIONES.map((accion) => (
        <button
          key={accion.id}
          type="button"
          className={`accion-tarjeta accion-${accion.tono}`}
          onClick={() => onNavigate(accion.id)}
        >
          <span className="accion-icono" aria-hidden="true">
            <i className={`bi ${accion.icono}`} />
          </span>
          <span className="accion-texto">
            <strong>{accion.titulo}</strong>
            <small>{accion.detalle}</small>
          </span>
        </button>
      ))}
    </section>
  );
}
