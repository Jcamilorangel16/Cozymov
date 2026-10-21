// Asocia la ruta raíz con la pantalla de inicio de sesión.
import Login from "../src/features/login/components/Login";

/**
 * Renderiza la pantalla de inicio de sesión en la ruta raíz.
 * @returns Pantalla principal de acceso.
 */
export default function Home() {
  return <Login />;
}
