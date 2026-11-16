# Contexto: reenvío del código de confirmación

## Objetivo del flujo

Durante el registro, Cozymov envía un código de seis dígitos al correo institucional. El usuario debe poder pedir otro desde la pantalla “Revisa tu correo” si el primero no llega o vence. Un nuevo envío debe actualizar el comprobante vigente en la interfaz para que solo el código recién enviado se use en el siguiente intento de confirmación.

## Implementación observada en el repositorio

La carpeta `Proyecto` contiene documentación del sistema; el código fuente está en la raíz del repositorio, en `Frontend` y `Backend`.

- `Frontend/src/features/register/components/PasoVerificacionCorreo.jsx`: pantalla de confirmación y botón de reenvío. Recibe `onReenviar` y lo deshabilita mientras hay una operación ocupada.
- `Frontend/src/features/register/components/Register.jsx`: conecta el botón con `solicitarCodigo` del hook.
- `Frontend/src/features/register/hooks/useRegisterForm.js`: `solicitarCodigo()` envía `POST /api/registro/codigo`. En éxito reemplaza el comprobante, asocia el correo, limpia el código ingresado y actualiza el mensaje de vencimiento. También controla carga y errores.
- `Frontend/app/api/registro/codigo/route.ts`: valida y reenvía la solicitud del frontend al backend.
- `Backend/Controllers/RegistroController.cs`: `POST /api/registro/codigo` genera un código nuevo y un comprobante firmado con vencimiento de 10 minutos, y envía el mensaje. Aplica límites de solicitudes y responde con error si el envío falla.
- `Backend/Services/BrevoEnviadorCorreo.cs`: envía el código por la API de Brevo. Usa `Correo:BrevoApiKey`, `Correo:Remitente` y opcionalmente `Correo:NombreRemitente`.
- `Frontend/app/api/registro/codigo/verificar/route.ts` y `Backend/Controllers/RegistroController.cs`: transportan y verifican el código y comprobante.

El endpoint de solicitud se puede usar tanto para el primer envío como para el reenvío. Reutilízalo si su comportamiento actual sigue siendo correcto; no hace falta crear un endpoint distinto solo para cambiar el texto del botón.

## Reglas y detalles relevantes

- En producción solo se aceptan correos que terminen en `.edu.co`; en desarrollo se permiten otros dominios válidos.
- El código vence en 10 minutos.
- Los límites de solicitudes están configurados en `Backend/Program.cs`; el flujo de reenvío debe respetarlos.
- Si el proveedor de correo falla, la interfaz no debe decir que el código fue enviado.
- El frontend servidor necesita `VITE_API_URL` e `INTERNAL_API_KEY`; el backend necesita su clave de verificación y las variables de Brevo indicadas en `Proyecto/Flujo - Confirmación de correo.md`.
- No se deben agregar valores reales de estas variables a documentación, código ni respuestas.

## Observación antes de implementar

Al preparar este contexto, el árbol de trabajo ya mostraba el botón “¿No te llegó? Revisa la carpeta de spam o envíalo de nuevo” y la llamada `onReenviar={solicitarCodigo}`. La solicitud del cambio debe comenzar comprobando si esa funcionalidad satisface el requisito de punta a punta. Si ya funciona, evita cambios redundantes; si falla en un caso real, identifica y corrige la causa concreta.
