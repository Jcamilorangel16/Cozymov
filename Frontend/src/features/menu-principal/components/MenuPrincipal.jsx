// Compone el cabezal de navegaciÃ³n y las vistas del menÃº principal.
"use client";

import { useEffect } from "react";
import { sincronizarIdSesion } from "../../../hooks/useSessionUserId";
import OfrecerViajes from "../../ofrecer-viajes/components/OfrecerViajes";
import MensajesView from "../../mensajes/components/MensajesView";
import "../styles/menu-principal.css";
import BuscarViajes from "../../buscar-viajes/components/BuscarViajes";
import AvisoSolicitudes from "./AvisoSolicitudes";
import PanelInicio from "./PanelInicio";
import SidebarMenu from "./SidebarMenu";
import { useAvisosSolicitudes } from "../hooks/useAvisosSolicitudes";
import { useMenuPrincipal } from "../hooks/useMenuPrincipal";
import { useConfirmarSalida } from "../hooks/useConfirmarSalida";
import { useAvisosMensajes } from "../../mensajes/hooks/useAvisosMensajes";
import { etiquetaDeVista } from "../constants/menuPrincipal";
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
  // La sesión es permanente: sessionStorage puede estar vacío aunque la cookie sea válida.
  // Se alinea antes de que los hijos lean el id con useSessionUserId.
  sincronizarIdSesion(usuarioActualId);

  // Renueva la cookie de sesión para que no caduque mientras se use la aplicación.
  useEffect(() => {
    void fetch("/api/sesion", { method: "POST" }).catch(() => {});
  }, []);

  // «Atrás» en el navegador no saca de la plataforma sin preguntar antes.
  useConfirmarSalida();

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
    volver,
    vistaAnterior,
  } = useMenuPrincipal();

  // Los conductores reciben aviso de las solicitudes de viaje nuevas.
  const { pendientes, aviso, cerrarAviso } = useAvisosSolicitudes(usuarioActualId, () =>
    irAVista("buscar"),
  );

  // Todos los usuarios reciben aviso de los mensajes nuevos. No hace falta avisar si ya están
  // en Mensajes con la pestaña visible.
  const { aviso: avisoMensaje, cerrarAviso: cerrarAvisoMensaje } = useAvisosMensajes(
    usuarioActualId,
    {
      alAbrirChat: abrirChatConUsuario,
      silenciar: () => vistaActiva === "mensajes" && document.visibilityState === "visible",
    },
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

        <AvisoSolicitudes
          aviso={avisoMensaje}
          etiquetaVer="Ver mensaje"
          desplazado={Boolean(aviso)}
          onCerrar={cerrarAvisoMensaje}
          onVer={() => {
            const contacto = avisoMensaje?.contacto;
            cerrarAvisoMensaje();
            if (contacto) abrirChatConUsuario(contacto);
          }}
        />

        <main className="main-content flex-grow-1 p-4">
          {vistaAnterior && (
            <div className="volver-vista-barra">
              <button
                type="button"
                className="btn-volver-vista"
                onClick={volver}
                aria-label={`Volver a ${etiquetaDeVista(vistaAnterior)}`}
              >
                <i className="bi bi-arrow-left" aria-hidden="true" />
                <span>Volver a {etiquetaDeVista(vistaAnterior)}</span>
              </button>
            </div>
          )}
          <div className="bloque_contenido" style={{ minHeight: 400 }}>
            {vistaActiva === "inicio" && <PanelInicio onNavigate={irAVista} />}

            {vistaActiva === "buscar" && (
              <div className="vista">
                <BuscarViajes
                  viajeSeleccionado={viajeSeleccionado}
                  setViajeSeleccionado={setViajeSeleccionado}
                  mensajeAccion={mensajeBusqueda}
                  setMensajeAccion={setMensajeBusqueda}
                  onNavigate={irAVista}
                  usuarioActualId={usuarioActualId}
                />
              </div>
            )}
            {vistaActiva === "ofrecer" && (
              <OfrecerViajes
                pasajeroSeleccionado={pasajeroSeleccionado}
                setPasajeroSeleccionado={setPasajeroSeleccionado}
                mensajeAccion={mensajePasajero}
                setMensajeAccion={setMensajePasajero}
                onNavigate={irAVista}
              />
            )}

            {vistaActiva === "mensajes" && (
              <div className="vista">
                <MensajesView
                  key={contactoInicial?.id ?? "lista"}
                  usuarioActualId={usuarioActualId}
                  contactoInicial={contactoInicial}
                />
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
