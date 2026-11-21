// Pantalla pública para restablecer la contraseña con un código por correo.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import RecuperarContrasena from "../../src/features/recuperar/components/RecuperarContrasena";
import { obtenerSesionActual } from "../../src/lib/auth";

export const metadata: Metadata = {
  title: "Restablecer contraseña | Cozymov",
};

/**
 * Si el dispositivo ya tiene sesión, entra al menú; si no, muestra el flujo.
 * @returns Pantalla de recuperación.
 */
export default async function RecuperarPage() {
  if (await obtenerSesionActual()) {
    redirect("/menu");
  }
  return <RecuperarContrasena />;
}
