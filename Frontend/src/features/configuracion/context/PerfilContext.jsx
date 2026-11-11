"use client";

// Estado compartido del perfil (foto y nombre) para toda la app.
import { createContext, useContext, useState } from "react";

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
  // TODO: cargar estos valores desde el backend.
  const [perfil, setPerfil] = useState({ nombre: "Alejandro", fotoUrl: null });

  return (
    <PerfilContext.Provider value={{ perfil, setPerfil }}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil debe usarse dentro de <PerfilProvider>");
  return ctx;
}