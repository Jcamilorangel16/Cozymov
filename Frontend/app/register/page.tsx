// Expone la pantalla de registro en su ruta pública.
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Register from "../../src/features/register/components/Register";
import {
  COOKIE_CORREO_VERIFICADO,
  MENSAJES_ERROR_VERIFICACION,
  verificarCorreoVerificado,
} from "../../src/lib/verificacionCorreo";
import { obtenerConfigMicrosoft } from "../../src/lib/microsoft";

export const metadata: Metadata = {
  title: "Crear cuenta | Cozymov",
};

/**
 * Renderiza la página pública de creación de cuenta.
 * @param props Parámetros de búsqueda; `verificacion_error` trae un código del
 *   flujo que verifica el correo con Google.
 * @returns Página de registro con el correo ya verificado, si lo hay.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ verificacion_error?: string | string[] }>;
}) {
  const verificado = await verificarCorreoVerificado(
    (await cookies()).get(COOKIE_CORREO_VERIFICADO)?.value,
  );
  const { verificacion_error: codigo } = await searchParams;
  // Solo se muestran mensajes propios; nunca texto tomado de la URL.
  const errorVerificacion =
    typeof codigo === "string" && Object.hasOwn(MENSAJES_ERROR_VERIFICACION, codigo)
      ? MENSAJES_ERROR_VERIFICACION[codigo]
      : "";

  return (
    <Register
      correoVerificado={verificado?.correo ?? ""}
      errorVerificacion={errorVerificacion}
      microsoftDisponible={obtenerConfigMicrosoft("") !== null}
    />
  );
}
