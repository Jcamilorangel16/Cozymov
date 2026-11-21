// Lógica de servidor común a /register/google y /register/microsoft.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CompletarRegistroGoogle from "./CompletarRegistroGoogle";
import { obtenerSesionActual } from "../../../lib/auth";
import {
  COOKIE_REGISTRO_GOOGLE,
  NOMBRE_PROVEEDOR,
  separarNombres,
  verificarRegistroGoogle,
  type ProveedorRegistro,
} from "../../../lib/registroGoogle";

/**
 * Muestra el formulario solo si hay una identidad pendiente y válida. Si la
 * identidad es de otro proveedor, lleva a la página de ese proveedor.
 * @param props Proveedor de la URL visitada.
 * @returns Formulario precargado o redirección.
 */
export default async function PaginaRegistroExterno({
  proveedor,
}: {
  proveedor: ProveedorRegistro;
}) {
  if (await obtenerSesionActual()) {
    redirect("/menu");
  }

  const pendiente = await verificarRegistroGoogle(
    (await cookies()).get(COOKIE_REGISTRO_GOOGLE)?.value,
  );
  if (!pendiente) {
    redirect(`/?${proveedor}_error=registro_vencido`);
  }
  if (pendiente.proveedor !== proveedor) {
    redirect(`/register/${pendiente.proveedor}`);
  }

  const [primerNombre, segundoNombre] = separarNombres(pendiente.nombres);
  const [primerApellido, segundoApellido] = separarNombres(pendiente.apellidos);

  return (
    <CompletarRegistroGoogle
      proveedor={proveedor}
      nombreProveedor={NOMBRE_PROVEEDOR[proveedor]}
      correo={pendiente.correo}
      nombres={{ primerNombre, segundoNombre, primerApellido, segundoApellido }}
    />
  );
}
