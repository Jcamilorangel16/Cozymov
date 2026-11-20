"use client";

// Estado compartido del perfil de forma dinámica para toda la aplicación.
import { createContext, useContext, useState, useEffect } from "react";

const PerfilContext = createContext(null);

export function PerfilProvider({ children }) {
  const [perfil, setPerfil] = useState({
    nombre: "",
    fotoUrl: null,
    ocupacion: "",
    cedula: "",
    descripcion: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controlador = new AbortController();

    async function cargarPerfil() {
      try {
        const [respuesta, respuestaPublico] = await Promise.all([
          fetch("/api/usuario", { cache: "no-store", signal: controlador.signal }),
          // Foto y descripción guardadas; si falla, el resto del perfil sigue sirviendo.
          fetch("/api/perfil", { cache: "no-store", signal: controlador.signal }).catch(() => null),
        ]);
        const data = await respuesta.json();
        const publico = respuestaPublico?.ok
          ? await respuestaPublico.json().catch(() => null)
          : null;
        if (!respuesta.ok) {
          throw new Error(data.error || "No se pudo cargar tu perfil.");
        }

        if (typeof data.nombre !== "string" || !data.nombre.trim()) {
          throw new Error("La respuesta no contiene el nombre de tu perfil.");
        }

        setPerfil({
          nombre: data.nombre.trim(),
          fotoUrl: publico?.fotoPerfil || data.fotoUrl || null,
          ocupacion: data.ocupacion || "",
          cedula: data.cedula || "",
          descripcion: publico?.descripcion || "",
        });
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error al cargar el perfil del usuario:", error);
          setError(error.message || "No se pudo cargar tu perfil.");
        }
      } finally {
        if (!controlador.signal.aborted) setLoading(false);
      }
    }

    void cargarPerfil();
    return () => controlador.abort();
  }, []);

  return (
    <PerfilContext.Provider value={{ perfil, setPerfil, loading, error }}>
      {children}
    </PerfilContext.Provider>
  );
}

export function usePerfil() {
  const ctx = useContext(PerfilContext);
  if (!ctx) throw new Error("usePerfil debe usarse dentro de <PerfilProvider>");
  return ctx;
}