"use client";

// Resumen de la actividad del usuario: viaje en curso, viaje publicado y calificación.
import { useEffect, useState } from "react";
import { fechaHoraSalida } from "../utils/destinosInicio";

/**
 * Pinta cinco estrellas según el promedio.
 * @param {{promedio: number}} props Promedio de 0 a 5.
 * @returns Estrellas llenas, medias o vacías.
 */
function Estrellas({ promedio }) {
  return (
    <span className="actividad-estrellas" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <i
          key={n}
          className={`bi ${
            promedio >= n ? "bi-star-fill" : promedio >= n - 0.5 ? "bi-star-half" : "bi-star"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * Tarjetas de actividad en el inicio.
 * @param {{idUsuario: string, viajeReservado: object|null, viajePublicado: object|null, cargando: boolean, onNavigate: (id: string) => void}} props
 * @returns Panel «Tu actividad».
 */
export default function ActividadInicio({
  idUsuario,
  viajeReservado,
  viajePublicado,
  cargando,
  onNavigate,
}) {
  const [resumen, setResumen] = useState({ estado: "cargando" });

  useEffect(() => {
    if (!idUsuario) return;
    const controlador = new AbortController();
    fetch(`/api/calificaciones?resumen=${encodeURIComponent(idUsuario)}`, {
      cache: "no-store",
      signal: controlador.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error("resumen");
        setResumen({ estado: "listo", total: datos.total ?? 0, promedio: datos.promedio ?? null });
      })
      .catch((error) => {
        if (error.name !== "AbortError") setResumen({ estado: "error" });
      });
    return () => controlador.abort();
  }, [idUsuario]);

  if (cargando) {
    return (
      <section className="actividad-panel" aria-label="Tu actividad" aria-busy="true">
        <div className="esqueleto esqueleto-actividad" />
        <div className="esqueleto esqueleto-actividad" />
      </section>
    );
  }

  const promedio = typeof resumen.promedio === "number" ? resumen.promedio : null;

  return (
    <section className="actividad-panel" aria-label="Tu actividad">
      <h2 className="h5 letra-contenido titulo-icono mb-3">
        <i className="bi bi-activity" aria-hidden="true" /> Tu actividad
      </h2>
      <div className="actividad-rejilla">
        <article className="actividad-tarjeta">
          <span className="actividad-etiqueta">
            <i className="bi bi-signpost-split-fill" aria-hidden="true" /> Viaje en curso
          </span>
          {viajeReservado ? (
            <>
              <strong>
                {viajeReservado.origen} → {viajeReservado.destino}
              </strong>
              <small>{fechaHoraSalida(viajeReservado)}</small>
              <button type="button" className="actividad-enlace" onClick={() => onNavigate("en-curso")}>
                Ver viaje <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </>
          ) : (
            <small>No tienes un viaje activo. ¡Busca uno arriba!</small>
          )}
        </article>

        <article className="actividad-tarjeta">
          <span className="actividad-etiqueta">
            <i className="bi bi-car-front-fill" aria-hidden="true" /> Tu viaje publicado
          </span>
          {viajePublicado ? (
            <>
              <strong>
                {viajePublicado.origen} → {viajePublicado.destino}
              </strong>
              <small>{fechaHoraSalida(viajePublicado)}</small>
              <button type="button" className="actividad-enlace" onClick={() => onNavigate("ofrecer")}>
                Administrar <i className="bi bi-arrow-right" aria-hidden="true" />
              </button>
            </>
          ) : (
            <small>No has publicado ningún viaje.</small>
          )}
        </article>

        <article className="actividad-tarjeta">
          <span className="actividad-etiqueta">
            <i className="bi bi-star-fill" aria-hidden="true" /> Tu calificación
          </span>
          {resumen.estado === "listo" && promedio !== null ? (
            <>
              <strong className="actividad-promedio">
                {promedio.toFixed(1)} <Estrellas promedio={promedio} />
              </strong>
              <small>{resumen.total === 1 ? "1 calificación" : `${resumen.total} calificaciones`}</small>
            </>
          ) : (
            <small>
              {resumen.estado === "cargando"
                ? "Cargando…"
                : resumen.estado === "error"
                  ? "No disponible por ahora."
                  : "Aún no tienes calificaciones."}
            </small>
          )}
          <button type="button" className="actividad-enlace" onClick={() => onNavigate("calificaciones")}>
            Ver detalle <i className="bi bi-arrow-right" aria-hidden="true" />
          </button>
        </article>
      </div>
    </section>
  );
}
