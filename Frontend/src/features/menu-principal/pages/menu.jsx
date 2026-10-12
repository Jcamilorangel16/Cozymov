"use client";

import { useEffect, useState } from "react";
import BuscarViajes from "../../buscar-viajes/components/BuscarViajes";
import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import PanelInicio from "../components/PanelInicio";
import SidebarMenu from "../components/SidebarMenu";
import "./menu-principal.css";

export default function MenuPrincipal() {
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [viajeSeleccionado, setViajeSeleccionado] = useState(null);
  const [mensajeBusqueda, setMensajeBusqueda] = useState("");
  const [pasajeroSeleccionado, setPasajeroSeleccionado] = useState(null);
  const [mensajePasajero, setMensajePasajero] = useState("");

  function irAVista(id) {
    setVistaActiva(id);
    if (id === "buscar") {
      setViajeSeleccionado(null);
      setMensajeBusqueda("");
    }
    if (id === "ofrecer") {
      setPasajeroSeleccionado(null);
      setMensajePasajero("");
    }
  }

  return (
    <>
      <SidebarMenu vistaActiva={vistaActiva} onNavigate={irAVista} />

      <main className="main-content flex-grow-1 p-4">
        <div className="border rounded-3 p-4 bloque_contenido" style={{ minHeight: 400 }}>
          <section hidden={vistaActiva !== "inicio"}>
            <PanelInicio onNavigate={irAVista} />
          </section>
          <section hidden={vistaActiva !== "buscar"}>
            <BuscarViajes
              viajeSeleccionado={viajeSeleccionado}
              setViajeSeleccionado={setViajeSeleccionado}
              mensajeAccion={mensajeBusqueda}
              setMensajeAccion={setMensajeBusqueda}
            />
          </section>
          <section hidden={vistaActiva !== "ofrecer"}>
            <OfrecerViajes
              pasajeroSeleccionado={pasajeroSeleccionado}
              setPasajeroSeleccionado={setPasajeroSeleccionado}
              mensajeAccion={mensajePasajero}
              setMensajeAccion={setMensajePasajero}
            />
          </section>
          <section hidden={vistaActiva !== "mensajes"}>
            <div className="vista"></div>
          </section>
          <section hidden={vistaActiva !== "en-curso"}>
            <div className="vista"></div>
          </section>
        </div>
      </main>
    </>
  );
}
