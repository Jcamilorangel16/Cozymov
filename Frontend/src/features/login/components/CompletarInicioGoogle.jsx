// Guarda el id de la sesión en el navegador y redirige al menú tras entrar con Google.
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Replica el paso final del login normal: sessionStorage y navegación al menú.
 * @param {{idUsuario: string}} props Id tomado de la sesión firmada del servidor.
 * @returns Mensaje breve mientras se redirige.
 */
export default function CompletarInicioGoogle({ idUsuario }) {
  const router = useRouter();

  useEffect(() => {
    window.sessionStorage.setItem("cozymov-usuario-id", idUsuario);
    router.replace("/menu");
  }, [idUsuario, router]);

  return (
    <p className="text-center mt-5" role="status">
      Iniciando sesión...
    </p>
  );
}
