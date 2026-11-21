// Pantalla para completar el registro con Microsoft: pide los datos que Microsoft no da.
import type { Metadata } from "next";
import PaginaRegistroExterno from "../../../src/features/register/components/PaginaRegistroExterno";

export const metadata: Metadata = {
  title: "Completar registro | Cozymov",
};

/**
 * Muestra el formulario solo si hay una identidad de Microsoft pendiente y válida.
 * @returns Formulario precargado o redirección.
 */
export default function RegistroMicrosoftPage() {
  return <PaginaRegistroExterno proveedor="microsoft" />;
}
