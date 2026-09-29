'use client';

import MenuPrincipal from '../src/features/menu-principal/pages/menu';

export default function Home() {
  return (
    <div className="d-flex min-vh-100" style={{ backgroundColor: '#341b65' }}>
      <MenuPrincipal />
    </div>
  );
}