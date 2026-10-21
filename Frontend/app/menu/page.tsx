import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  NOMBRE_COOKIE_SESION,
  verificarSesion,
} from '../../src/lib/auth';

import MenuPrincipal from '../../src/features/menu-principal/pages/menu';

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
