"use client";

import { useEffect } from "react";
import "./RegistroExitosoModal.css";

export default function RegistroExitosoModal({
  estado,
  entidad,
  mensajeExitoso,
  onContinuar,
  tituloCarga = `Registrando ${entidad}`,
  tituloExitoso = "¡Registro exitoso!",
  mensajeCarga = "Estamos guardando tu información. Esto tomará unos segundos.",
  duracionMs = 2000,
  autoContinuarMs,
}) {
  useEffect(() => {
    if (estado !== "exitoso" || autoContinuarMs === undefined) return undefined;

    const temporizador = window.setTimeout(onContinuar, autoContinuarMs);
    return () => window.clearTimeout(temporizador);
  }, [autoContinuarMs, estado, onContinuar]);

  if (estado === "inactivo") return null;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered">
          <section
            className="modal-content border-0 rounded-4 shadow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="estado-registro-titulo"
            aria-describedby="estado-registro-mensaje"
          >
            {estado === "cargando" ? (
              <div className="modal-body p-4 p-md-5 text-center">
                <div className="spinner-border text-primary mb-4" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <h3 className="h4 fw-bold mb-2" id="estado-registro-titulo">
                  {tituloCarga}
                </h3>
                <p className="text-secondary mb-4" id="estado-registro-mensaje" role="status">
                  {mensajeCarga}
                </p>
                <div className="progress" aria-hidden="true">
                  <div
                    className="progress-bar registro-exitoso__progress-bar"
                    style={{ animationDuration: `${duracionMs}ms` }}
                  />
                </div>
              </div>
            ) : (
              <div className="modal-body p-4 p-md-5 text-center">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success fs-2 fw-bold mx-auto mb-4"
                  style={{ width: 64, height: 64 }}
                  aria-hidden="true"
                >
                  ✓
                </div>
                <h3 className="h4 fw-bold mb-2" id="estado-registro-titulo">
                  {tituloExitoso}
                </h3>
                <p className="text-secondary mb-4" id="estado-registro-mensaje">
                  {mensajeExitoso}
                </p>
                {autoContinuarMs === undefined && (
                  <button
                    type="button"
                    className="btn btn-primary w-100 fw-bold"
                    onClick={onContinuar}
                    autoFocus
                  >
                    Continuar
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
