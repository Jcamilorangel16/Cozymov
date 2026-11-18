// Compone el cabezal de navegaciÃ³n y las vistas del menÃº principal.
"use client";

import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import MensajesView from "../../mensajes/components/MensajesView";
import "../styles/menu-principal.css";
import BuscarViajes from "../../buscar-viajes/components/BuscarViajes";
import AvisoSolicitudes from "./AvisoSolicitudes";
import PanelInicio from "./PanelInicio";
import SidebarMenu from "./SidebarMenu";
import { useAvisosSolicitudes } from "../hooks/useAvisosSolicitudes";
import { useMenuPrincipal } from "../hooks/useMenuPrincipal";
import ViajeEnCurso from "../../viaje-en-curso/components/ViajeEnCurso";
import ConfiguracionGeneral from "../../configuracion/components/ConfiguracionGeneral";
import { PerfilProvider } from "../../configuracion/context/PerfilContext";
import CalificacionesView from "../../calificaciones/components/CalificacionesView";


/**
 * Compone la barra lateral y las vistas del menÃº de usuario.
 * @param {{usuarioActualId: string}} props Identidad autenticada.
 * @returns Vista principal de la aplicaciÃ³n.
 */
export default function MenuPrincipal({ usuarioActualId }) {
  
  const {
    vistaActiva,
    contactoInicial,
    abrirChatConUsuario,
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

  // Los conductores reciben aviso de las solicitudes de viaje nuevas.
  const { pendientes, aviso, cerrarAviso } = useAvisosSolicitudes(usuarioActualId, () =>
    irAVista("buscar"),
  );

  return (
    <PerfilProvider>
      <div className="app-shell">
        <div className="menu-fondo" aria-hidden="true" />
        <SidebarMenu
          vistaActiva={vistaActiva}
          onNavigate={irAVista}
          solicitudesPendientes={pendientes}
        />
        <AvisoSolicitudes
          aviso={aviso}
          onCerrar={cerrarAviso}
          onVer={() => {
            cerrarAviso();
            irAVista("buscar");
          }}
        />

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
                  onNavigate={irAVista}
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
                <MensajesView usuarioActualId={usuarioActualId} />
              </div>
            )}

            {vistaActiva === "en-curso" && (
              <div className="vista">
                <ViajeEnCurso onNavigate={irAVista} />
              </div>
            )}

            {vistaActiva === "calificaciones" && (
              <div className="vista">
                <CalificacionesView />
              </div>
            )}

            {vistaActiva === "configuracion" && (
              <div className="vista">
                <ConfiguracionGeneral />
              </div>
            )}
          </div>
        </main>
      </div>
    </PerfilProvider>
  );
}
