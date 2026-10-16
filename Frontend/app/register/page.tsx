import type { Metadata } from "next";
import Register from "../../src/features/register/pages/register";

export const metadata: Metadata = {
  title: "Crear cuenta | Cozymov",
};

export default function RegisterPage() {
  return <Register />;
}