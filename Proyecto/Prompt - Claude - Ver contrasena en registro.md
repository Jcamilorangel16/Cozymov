# Prompt para Claude: mostrar u ocultar contraseña durante el registro

Lee primero el contexto de la carpeta `Proyecto`, en especial `Proyecto/Mapa - Frontend.md` y `Proyecto/Flujo - Confirmación de correo.md`. Después inspecciona el código actual antes de editarlo.

## Objetivo

Agrega al formulario de registro una forma clara de mostrar u ocultar la contraseña mientras el usuario la escribe. Aplica la misma función al campo **Contraseña** y al campo **Confirmar Contraseña**, para que el usuario pueda comprobar ambos valores.

## Archivos relacionados

- `Frontend/src/features/register/components/CredencialesRegistro.jsx`: contiene actualmente ambos campos, ambos con `type="password"`.
- `Frontend/src/features/register/styles/register.css`: estilos del formulario de registro.
- `Frontend/src/features/register/components/Register.jsx`: integra el componente de credenciales.

Revisa si existen patrones reutilizables para mostrar contraseñas en otros formularios y sigue el estilo del proyecto cuando sea apropiado. Mantén el estado y la lógica de registro existentes.

## Requisitos

- Cada campo debe tener su propio control para mostrar/ocultar; cambiar uno no debe cambiar el otro.
- El control debe funcionar con teclado y lectores de pantalla: usa un botón real con `type="button"`, un nombre accesible que indique la acción actual y foco visible.
- No debe enviar el formulario, cambiar el valor, mover el foco de forma inesperada ni interferir con la navegación de teclado ya existente.
- Conserva los valores controlados, las validaciones, los identificadores y las etiquetas actuales.
- Asegura que el diseño sea usable en pantallas pequeñas y no tape el texto escrito.
- No registres ni muestres las contraseñas en consola, mensajes o almacenamiento adicional.
- Haz cambios pequeños; no modifiques el inicio de sesión ni otros formularios salvo que sea necesario para reutilizar un patrón ya existente.

## Validación

Ejecuta la verificación más pequeña y relevante disponible para los archivos modificados. Resume qué cambiaste y qué validación ejecutaste. Si el proyecto ya tuviera una solución equivalente en el registro, descríbela y evita duplicarla.
