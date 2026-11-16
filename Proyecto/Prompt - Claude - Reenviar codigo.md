# Prompt para Claude: reenviar código de confirmación

Lee primero los documentos de contexto ubicados en la carpeta `Proyecto`, en especial:

- `Proyecto/Contexto - Reenviar codigo.md`
- `Proyecto/Flujo - Confirmación de correo.md`
- `Proyecto/Mapa - Frontend.md`
- `Proyecto/Mapa - Backend.md`

La carpeta `Proyecto` está dentro de la raíz del repositorio. Revisa también el código fuente descrito en el contexto; no asumas que los documentos reflejan exactamente la implementación actual.

## Objetivo

Asegura que el usuario pueda solicitar de nuevo el código desde la pantalla **“Revisa tu correo”** durante el registro, y que el código reenviado sea el que se use para confirmar la dirección.

Antes de cambiar archivos, inspecciona el flujo actual de extremo a extremo. El repositorio ya parece tener un botón “envíalo de nuevo”, un manejador `solicitarCodigo()` y un endpoint para pedir códigos. Determina si el reenvío ya funciona correctamente. Si ya está completo, no dupliques endpoints ni lógica: valida el comportamiento y explica brevemente qué encontraste. Si falta algo o existe un defecto, corrígelo con cambios pequeños y coherentes con los patrones existentes.

## Comportamiento requerido

- El botón de reenvío debe estar disponible en el paso de confirmación y usar el correo que se está verificando.
- Al solicitar un nuevo código, muestra estado de carga y evita solicitudes simultáneas.
- Si el envío funciona, conserva al usuario en la pantalla de confirmación, borra el código anterior ingresado y reemplaza el comprobante por el nuevo que devuelve el backend.
- Si el envío falla, muestra un error claro y permite volver a intentarlo sin mostrar una confirmación falsa.
- Respeta la expiración de 10 minutos, los límites de solicitudes existentes, la validación del correo institucional y el manejo de errores ya implementado.
- No expongas claves, códigos, comprobantes ni credenciales en el navegador, repositorio o logs. No agregues secretos a archivos versionados.
- No crees una ruta alternativa si el endpoint existente cubre el caso. No cambies otros flujos de registro que no sean necesarios.

## Validación

Añade o ajusta pruebas enfocadas solo si hacen falta para demostrar el comportamiento corregido. Ejecuta las pruebas o verificaciones más pequeñas y relevantes disponibles para los archivos modificados. Al terminar, resume:

1. Qué encontraste sobre la implementación existente.
2. Qué archivos cambiaste y qué comportamiento resuelven.
3. Qué pruebas ejecutaste y sus resultados.
4. Cualquier configuración externa necesaria para que el correo llegue (por ejemplo, variables del backend y remitente autenticado en Brevo), sin pedir ni imprimir secretos.
