// Tarjeta con título y ayuda para agrupar cada bloque de la sección de seguridad.
import { useId } from "react";

/**
 * Presenta un bloque semántico con título y texto de ayuda.
 * @param {{titulo: string, ayuda?: string, children: React.ReactNode}} props Contenido del bloque.
 * @returns {JSX.Element} Tarjeta de seguridad.
 */
export default function BloqueSeguridad({ titulo, ayuda, children }) {
  const tituloId = useId();

  return (
    <section className="config-bloque" aria-labelledby={tituloId}>
      <h6 id={tituloId} className="config-bloque-titulo">
        {titulo}
      </h6>
      {ayuda && <p className="config-ayuda">{ayuda}</p>}
      {children}
    </section>
  );
}
