// Expone la pantalla de registro en su ruta pública.
import type { Metadata } from "next";
import Register from "../../src/features/register/components/Register";

export const metadata: Metadata = {
  title: "Crear cuenta | Cozymov",
};

/**
 * Renderiza la página pública de creación de cuenta.
 * @returns Página de registro con sus metadatos.
 */
export default function RegisterPage() {
  return <Register />;
}