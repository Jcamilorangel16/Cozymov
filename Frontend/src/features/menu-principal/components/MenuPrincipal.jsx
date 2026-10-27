// Compone el cabezal de navegación y las vistas del menú principal.
"use client";

import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import MensajesView from "../../mensajes/components/MensajesView";
import "../styles/menu-principal.css";
import BuscarViajes from "../../buscar-viajes/components/BuscarViajes";
import PanelInicio from "./PanelInicio";
import SidebarMenu from "./SidebarMenu";
import { useMenuPrincipal } from "../hooks/useMenuPrincipal";
import ViajeEnCurso from "../../viaje-en-curso/components/ViajeEnCurso";
  import ConfiguracionGeneral from "../../configuracion/components/ConfiguracionGeneral";

/**
 * Compone la barra lateral y las vistas del menú de usuario.
 * @returns Vista principal de la aplicación.
 */
export default function MenuPrincipal() {
  const {
    vistaActiva,
    viajeSeleccionado,
    setViajeSeleccionado,
    mensajeBusqueda,
    setMensajeBusqueda,
    pasajeroSeleccionado,
    setPasajeroSeleccionado,
    mensajePasajero,
    setMensajePasajero,
    irAVista,
  } = useMenuPrincipal();

  return (
    <div className="app-shell">
      <SidebarMenu vistaActiva={vistaActiva} onNavigate={irAVista} />

      <main className="main-content flex-grow-1 p-4">
        <div className="border rounded-3 p-4 bloque_contenido" style={{ minHeight: 400 }}>

          {vistaActiva === "inicio" && <PanelInicio onNavigate={irAVista} />}

          {vistaActiva === "buscar" && (
            <div className="vista">
              <BuscarViajes
                viajeSeleccionado={viajeSeleccionado}
                setViajeSeleccionado={setViajeSeleccionado}
                mensajeAccion={mensajeBusqueda}
                setMensajeAccion={setMensajeBusqueda}
              />
            </div>
          )}

          {vistaActiva === "ofrecer" && (
            <OfrecerViajes
              pasajeroSeleccionado={pasajeroSeleccionado}
              setPasajeroSeleccionado={setPasajeroSeleccionado}
              mensajeAccion={mensajePasajero}
              setMensajeAccion={setMensajePasajero}
            />
          )}

          {vistaActiva === "mensajes" && (
            <div className="vista">
              <MensajesView usuarioActualId="usuario_actual" receptorId="receptor_ejemplo" />
            </div>
          )}
          {vistaActiva === "en-curso" && (<div className="vista"> <ViajeEnCurso onNavigate={irAVista} /> </div>)}

          {vistaActiva === "configuracion" && (<div className="vista"> <ConfiguracionGeneral /> </div>)}
        </div>
      </main>
    </div>
  );
}
