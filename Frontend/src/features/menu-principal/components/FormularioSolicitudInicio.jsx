"use client";

import { useId, useState } from "react";

function fechaLocalISO() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

/**
 * Formulario para solicitar un viaje cuando no hay resultados.
 * @param {{destino: string, rutas: Array, enviando: boolean, error: string, creada: boolean, onEnviar: (campos: object) => void}} props
 * @returns Formulario de solicitud con precio, fecha, hora y ruta compatible.
 */
export default function FormularioSolicitudInicio({
  destino,
  rutas,
  enviando,
  error,
  creada,
  onEnviar,
}) {
  const id = useId();
  const [precio, setPrecio] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [idRutaElegida, setIdRutaElegida] = useState("");

  // Con una sola ruta compatible se usa esa; con varias, el usuario elige el origen.
  const idRuta = rutas.length === 1 ? String(rutas[0].idRuta) : idRutaElegida;

  function enviar(evento) {
    evento.preventDefault();
    if (enviando || creada) return;
    onEnviar({ precio, fecha, hora, idRuta });
  }

  return (
    <section className="viaje-item inicio-destacado" aria-labelledby={`${id}-titulo`}>
      <div className="vacio-ilustracion" aria-hidden="true">
        <i className="bi bi-signpost-2-fill" />
        <i className="bi bi-emoji-neutral-fill" />
        <i className="bi bi-car-front" />
      </div>
      <h2 className="h5 letra-contenido titulo-icono" id={`${id}-titulo`}>
        <i className="bi bi-megaphone-fill" aria-hidden="true" />
        Nadie va a {destino} todavía
      </h2>
      <p className="texto-secundario">
        Propón un precio y cuándo necesitas viajar a {destino}.
      </p>

      {rutas.length === 0 ? (
        <div className="alert alert-warning" role="alert">
          No hay una ruta registrada hacia «{destino}», por eso todavía no se puede enviar la
          solicitud. Un conductor debe publicar primero una ruta a ese destino.
        </div>
      ) : (
        <form onSubmit={enviar} noValidate>
          {rutas.length > 1 && (
            <div className="mb-3">
              <label className="form-label letra-contenido" htmlFor={`${id}-ruta`}>
                Origen de la ruta
              </label>
              <select
                id={`${id}-ruta`}
                className="form-select"
                value={idRutaElegida}
                onChange={(evento) => setIdRutaElegida(evento.target.value)}
                required
              >
                <option value="">Selecciona un origen</option>
                {rutas.map((ruta) => (
                  <option key={ruta.idRuta} value={ruta.idRuta}>
                    {ruta.origen} → {ruta.destino}
                  </option>
                ))}
              </select>
            </div>
          )}
          {rutas.length === 1 && (
            <p className="letra-contenido small">
              Ruta: {rutas[0].origen} → {rutas[0].destino}
            </p>
          )}

          <div className="mb-3">
            <label className="form-label letra-contenido" htmlFor={`${id}-precio`}>
              Precio que propones (COP)
            </label>
            <input
              id={`${id}-precio`}
              type="number"
              className="form-control"
              inputMode="numeric"
              min="1"
              step="100"
              value={precio}
              onChange={(evento) => setPrecio(evento.target.value)}
              required
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-7">
              <label className="form-label letra-contenido" htmlFor={`${id}-fecha`}>
                Fecha
              </label>
              <input
                id={`${id}-fecha`}
                type="date"
                className="form-control"
                min={fechaLocalISO()}
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                required
              />
            </div>
            <div className="col-5">
              <label className="form-label letra-contenido" htmlFor={`${id}-hora`}>
                Hora
              </label>
              <input
                id={`${id}-hora`}
                type="time"
                className="form-control"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {creada && (
            <div className="alert alert-success" role="status">
              Solicitud registrada. Puedes consultarla en «Solicitudes».
            </div>
          )}

          <button type="submit" className="btn-reservar" disabled={enviando || creada}>
            {enviando ? "Enviando..." : "Solicitar viaje"}
          </button>
        </form>
      )}
    </section>
  );
}
