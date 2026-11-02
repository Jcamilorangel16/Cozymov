// Protege la ruta del menú y renderiza su feature principal.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  NOMBRE_COOKIE_SESION,
  verificarSesion,
} from '../../src/lib/auth';

import MenuPrincipal from '../../src/features/menu-principal/components/MenuPrincipal';

/**
 * Verifica la cookie de sesión y presenta el menú protegido.
 * @returns Página del menú principal o redirección a login.
 */
export default async function MenuPage() {
  const token = (await cookies()).get(NOMBRE_COOKIE_SESION)?.value;

  if (!token || !(await verificarSesion(token))) {
    redirect('/');
  }

  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: '#FBFAF8' }}>
      <MenuPrincipal />
    </div>
  );
}
