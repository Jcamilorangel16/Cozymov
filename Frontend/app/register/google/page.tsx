// Pantalla para completar el registro con Google: pide los datos que Google no da.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CompletarRegistroGoogle from "../../../src/features/register/components/CompletarRegistroGoogle";
import { obtenerSesionActual } from "../../../src/lib/auth";
import {
  COOKIE_REGISTRO_GOOGLE,
  separarNombres,
  verificarRegistroGoogle,
} from "../../../src/lib/registroGoogle";

export const metadata: Metadata = {
  title: "Completar registro | Cozymov",
};

/**
 * Muestra el formulario solo si hay una identidad de Google pendiente y válida.
 * @returns Formulario precargado o redirección.
 */
export default async function RegistroGooglePage() {
  if (await obtenerSesionActual()) {
    redirect("/menu");
  }

  const pendiente = await verificarRegistroGoogle(
    (await cookies()).get(COOKIE_REGISTRO_GOOGLE)?.value,
  );
  if (!pendiente) {
    redirect("/?google_error=registro_vencido");
  }

  const [primerNombre, segundoNombre] = separarNombres(pendiente.nombres);
  const [primerApellido, segundoApellido] = separarNombres(pendiente.apellidos);

  return (
    <CompletarRegistroGoogle
      correo={pendiente.correo}
      nombres={{ primerNombre, segundoNombre, primerApellido, segundoApellido }}
    />
  );
}
