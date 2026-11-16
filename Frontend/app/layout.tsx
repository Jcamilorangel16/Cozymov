// Define el layout raíz, metadatos y recursos visuales compartidos.
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import LoadingScreen from "../src/components/LoadingScreen";
import "./globals.css";
import CustomCursor from "../src/components/CustomCursor";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cozymov",
  description: "Plataforma de viajes compartidos",
};

/**
 * Envuelve las páginas con el documento HTML y estilos compartidos.
 * @param props Contenido de la ruta actual.
 * @returns Estructura raíz del documento.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`}
      >
        <CustomCursor />
        <LoadingScreen />
        {children}
      </body>
    </html>
  );
}