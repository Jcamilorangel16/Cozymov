// Asocia la ruta raíz con la pantalla de inicio de sesión.
import { redirect } from "next/navigation";
import Login from "../src/features/login/components/Login";
import { obtenerSesionActual } from "../src/lib/auth";
import { MENSAJES_ERROR_GOOGLE } from "../src/lib/google";
import { MENSAJES_ERROR_MICROSOFT, obtenerConfigMicrosoft } from "../src/lib/microsoft";

/** Solo se muestran mensajes propios; nunca texto tomado de la URL. */
function mensaje(codigo: unknown, mensajes: Record<string, string>): string {
  return typeof codigo === "string" && Object.hasOwn(mensajes, codigo) ? mensajes[codigo] : "";
}

/**
 * Renderiza la pantalla de inicio de sesión en la ruta raíz.
 * Si el dispositivo ya tiene una sesión válida, entra directo al menú.
 * @param props Parámetros de búsqueda; `google_error` y `microsoft_error`
 *   traen un código del flujo de cada proveedor.
 * @returns Pantalla principal de acceso.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    google_error?: string | string[];
    microsoft_error?: string | string[];
  }>;
}) {
  if (await obtenerSesionActual()) {
    redirect("/menu");
  }

  const { google_error: codigoGoogle, microsoft_error: codigoMicrosoft } = await searchParams;
  const errorExterno =
    mensaje(codigoGoogle, MENSAJES_ERROR_GOOGLE) ||
    mensaje(codigoMicrosoft, MENSAJES_ERROR_MICROSOFT);
  // El botón solo aparece cuando el servidor tiene la configuración completa.
  const microsoftDisponible = obtenerConfigMicrosoft("") !== null;

  return <Login errorExterno={errorExterno} microsoftDisponible={microsoftDisponible} />;
}
