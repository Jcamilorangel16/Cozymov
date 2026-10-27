"use client";

// Vista de configuración con menú interno y una sección activa a la vez.
import { useState } from "react";
import { seccionesConfiguracion } from "../constants/configuracion";
import "../styles/configuracion.css";
import TuPerfil from "./TuPerfil";
import TuSeguridad from "./TuSeguridad";
import TuVehiculo from "./TuVehiculo";

const vistas = {
  perfil: TuPerfil,
  seguridad: TuSeguridad,
  vehiculo: TuVehiculo,
};

/**
 * Renderiza el menú de secciones y el contenido de la sección elegida.
 * @returns Pantalla de configuración general.
 */
export default function ConfiguracionGeneral() {
  const [seccion, setSeccion] = useState("perfil");
  const Vista = vistas[seccion];

  return (
    <div>
      <h3 className="letra-contenido mb-3">Configuración</h3>

      <div className="config-layout">
        <nav className="config-menu" aria-label="Secciones de configuración">
          {seccionesConfiguracion.map((item) => (
            <button
              key={item.id}
              type="button"
              className={"config-item" + (seccion === item.id ? " activo" : "")}
              aria-current={seccion === item.id ? "page" : undefined}
              onClick={() => setSeccion(item.id)}
            >
              <span aria-hidden="true">{item.icono}</span> {item.label}
            </button>
          ))}
        </nav>

        <section className="config-card">
          <Vista />
        </section>
      </div>
    </div>
  );
}