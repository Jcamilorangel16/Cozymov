// Completa el inicio de sesión con Microsoft en el navegador y entra al menú.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOMBRE_COOKIE_SESION, verificarSesion } from "../../../src/lib/auth";
import CompletarInicioGoogle from "../../../src/features/login/components/CompletarInicioGoogle";

/**
 * Valida la sesión recién creada y delega en el mismo componente cliente del
 * flujo de Google (solo copia el id al sessionStorage y va al menú).
 * @returns Pantalla breve de transición o redirección al login.
 */
export default async function InicioMicrosoftPage() {
  const token = (await cookies()).get(NOMBRE_COOKIE_SESION)?.value;
  const sesion = token ? await verificarSesion(token) : null;
  if (!sesion) redirect("/");

  return <CompletarInicioGoogle idUsuario={sesion.id} />;
}
