// Asocia la ruta raíz con la pantalla de inicio de sesión.
import { redirect } from "next/navigation";
import Login from "../src/features/login/components/Login";
import { obtenerSesionActual } from "../src/lib/auth";
import { MENSAJES_ERROR_GOOGLE } from "../src/lib/google";

/**
 * Renderiza la pantalla de inicio de sesión en la ruta raíz.
 * Si el dispositivo ya tiene una sesión válida, entra directo al menú.
 * @param props Parámetros de búsqueda; `google_error` trae un código del flujo de Google.
 * @returns Pantalla principal de acceso.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ google_error?: string | string[] }>;
}) {
  if (await obtenerSesionActual()) {
    redirect("/menu");
  }

  const { google_error: codigo } = await searchParams;
  // Solo se muestran mensajes propios; nunca texto tomado de la URL.
  const errorGoogle =
    typeof codigo === "string" && Object.hasOwn(MENSAJES_ERROR_GOOGLE, codigo)
      ? MENSAJES_ERROR_GOOGLE[codigo]
      : "";

  return <Login errorGoogle={errorGoogle} />;
}
