"use client";

// Estado compartido del perfil de forma dinámica para toda la aplicación.
import { createContext, useContext, useState, useEffect } from "react";

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
  const [perfil, setPerfil] = useState({
    nombre: "Cargando...",
    fotoUrl: null,
    ocupacion: "",
    cedula: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarPerfil() {
      try {
        const res = await fetch("/api/usuario");
        if (res.ok) {
          const data = await res.json();
          setPerfil({
            nombre: data.nombre || "Usuario",
            fotoUrl: data.fotoUrl || null,
            ocupacion: data.ocupacion || "",
            cedula: data.cedula || "",
          });
        } else {
          setPerfil({
            nombre: "Invitado",
            fotoUrl: null,
            ocupacion: "",
            cedula: "",
          });
        }
      } catch (error) {
        console.error("Error al cargar el perfil del usuario:", error);
        setPerfil({
          nombre: "Invitado",
          fotoUrl: null,
          ocupacion: "",
          cedula: "",
        });
      } finally {
        setLoading(false);
      }
    }

    cargarPerfil();
  }, []);

  return (
    <PerfilContext.Provider value={{ perfil, setPerfil, loading }}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil debe usarse dentro de <PerfilProvider>");
  return ctx;
}