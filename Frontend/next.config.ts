import type { NextConfig } from "next";
import { origenWebSocketHub, urlHubTiempoReal } from "./src/lib/tiempoRealUrl";

const esDesarrollo = process.env.NODE_ENV !== "production";

// El navegador abre el WebSocket de tiempo real directamente contra el backend (las
// funciones de Vercel no mantienen WebSockets). Se calcula al compilar: si cambian
// VITE_API_URL o SIGNALR_HUB_URL hay que volver a desplegar.
const origenHub = origenWebSocketHub(urlHubTiempoReal(process.env));

// Política de contenido. Next.js inyecta scripts en línea y Bootstrap,
// SweetAlert2 y Leaflet escriben estilos en línea, así que ambos se permiten;
// lo demás queda limitado al propio sitio. Las imágenes admiten https: por las
// teselas de OpenStreetMap y las fotos de vehículos, que son URL externas.
const politicaContenido = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${origenHub ? ` ${origenHub}` : ""}${esDesarrollo ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasSeguridad = [
  { key: "Content-Security-Policy", value: politicaContenido },
  // Impide incrustar la app en un iframe ajeno (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // El mapa del viaje en curso usa la ubicación; el resto de sensores se niega.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
  ...(esDesarrollo
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]),
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    // El registro de vehículo envía hasta 7 archivos de 5 MB; el valor por defecto
    // (10 MB) truncaría el cuerpo que Next.js reenvía a la API.
    proxyClientMaxBodySize: "40mb",
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      {
        // Las respuestas de la API llevan datos personales: no deben guardarse.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
