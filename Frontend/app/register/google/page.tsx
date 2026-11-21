// Pantalla para completar el registro con Google: pide los datos que Google no da.
import type { Metadata } from "next";
import PaginaRegistroExterno from "../../../src/features/register/components/PaginaRegistroExterno";

export const metadata: Metadata = {
  title: "Completar registro | Cozymov",
};

/**
 * Muestra el formulario solo si hay una identidad de Google pendiente y válida.
 * @returns Formulario precargado o redirección.
 */
export default function RegistroGooglePage() {
  return <PaginaRegistroExterno proveedor="google" />;
}
