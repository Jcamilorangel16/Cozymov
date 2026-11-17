// Defensa contra CSRF: las rutas /api que cambian datos solo aceptan
// solicitudes hechas desde la propia aplicación.
//
// La sesión viaja en una cookie que el navegador adjunta sola, de modo que una
// página ajena podría intentar enviar un POST en nombre del usuario. La cookie
// ya es SameSite=Lax; esta comprobación añade una segunda barrera que no
// depende del navegador ni de que un subdominio hermano sea de confianza.
import { NextResponse, type NextRequest } from "next/server";

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

function rechazar() {
  return NextResponse.json(
    { error: "Solicitud rechazada: el origen no está permitido." },
    { status: 403 },
  );
}

/** Orígenes adicionales admitidos (por ejemplo, tras un proxy que cambia el Host). */
function origenesPermitidos(): string[] {
  return (process.env.ORIGENES_PERMITIDOS ?? "")
    .split(",")
    .map((origen) => origen.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function proxy(request: NextRequest) {
  if (METODOS_SEGUROS.has(request.method)) {
    return NextResponse.next();
  }

  // Los navegadores envían Origin en todo POST/PUT/DELETE hecho con fetch o un
  // formulario. Si falta, el cliente no es un navegador y no hay CSRF posible.
  const origen = request.headers.get("origin");
  if (origen === null) {
    return request.headers.get("sec-fetch-site") === "cross-site"
      ? rechazar()
      : NextResponse.next();
  }

  let anfitrionOrigen: string;
  try {
    anfitrionOrigen = new URL(origen).host;
  } catch {
    // "null" (iframe aislado, redirección entre sitios) u otro valor no válido.
    return rechazar();
  }

  const anfitriones = [
    request.headers.get("host"),
    request.headers.get("x-forwarded-host"),
    request.nextUrl.host,
  ];
  if (anfitriones.includes(anfitrionOrigen)) {
    return NextResponse.next();
  }
  if (origenesPermitidos().includes(origen.replace(/\/+$/, ""))) {
    return NextResponse.next();
  }

  return rechazar();
}

export const config = {
  matcher: "/api/:path*",
};
