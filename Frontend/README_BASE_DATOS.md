# Datos y despliegue

El frontend Next.js actúa como una capa de aplicación: sus rutas validan la
sesión y se comunican con la API ASP.NET Core. El backend es quien usa Entity
Framework Core para acceder a PostgreSQL en las funciones de viajes,
reservas, usuarios, vehículos y mensajes.

## Variables de entorno

En Vercel configura:

| Variable | Uso |
| --- | --- |
| `VITE_API_URL` | URL pública HTTPS del backend ASP.NET Core, sin agregar `/api`. |
| `SESSION_SECRET` | Secreto privado para firmar las sesiones del frontend. Mínimo 32 caracteres aleatorios; con menos, el inicio de sesión falla. |
| `INTERNAL_API_KEY` | Clave compartida entre Next.js y el backend. El backend la exige en todas las rutas `/api`. |
| `ORIGENES_PERMITIDOS` | Opcional. Orígenes adicionales (separados por coma) desde los que se aceptan POST/PUT/DELETE a `/api`. Solo hace falta si un proxy cambia el `Host` y las solicitudes legítimas reciben 403. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Credenciales OAuth de Google para el inicio de sesión con Google. |
| `GOOGLE_REDIRECT_URI` | URL de callback registrada en Google. En producción: `https://cozymov.com/api/auth/google/callback`. Su origen también se usa para las redirecciones finales. Si falta, se usa el origen de la solicitud. |
| `SIGNALR_HUB_URL` | Opcional. URL pública del Hub de tiempo real; por defecto `VITE_API_URL` + `/hubs/tiempo-real`. `off` lo desactiva (la app sigue con sus consultas HTTP). Solo HTTPS en producción. Entra en la CSP al compilar: si cambia, vuelve a desplegar. Ver [`README_TIEMPO_REAL.md`](../README_TIEMPO_REAL.md). |

En Google Cloud Console (APIs y servicios > Credenciales > ID de cliente OAuth)
agrega `https://cozymov.com` en "Orígenes autorizados de JavaScript" y
`https://cozymov.com/api/auth/google/callback` en "URI de redireccionamiento
autorizados". Si usas también `www`, agrégalo igual y redirige uno al otro.

El flujo pide los scopes `openid`, `email` y `profile` (no sensibles; en la
pantalla de consentimiento basta con tenerlos listados). Con Google también se
puede crear una cuenta, pero solo con correos `@unicesar.edu.co`: la identidad
pendiente viaja en la cookie `google_registro`, firmada con una clave derivada
de `SESSION_SECRET`. No requiere variables nuevas.

### Correo (SMTP) para los códigos de registro y recuperación

Los códigos de 6 dígitos los envía el **backend**. Configúralo en el servicio
del backend (no en Vercel). Si está `Resend__ApiKey`, se usa la API HTTPS de
Resend (puerto 443) y se ignora `Smtp__*`. Úsala si el host bloquea los puertos
SMTP: el plan gratis de Render bloquea el 25, el 465 y el 587, y el envío falla
con `TimeoutException`.

| Variable | Uso |
| --- | --- |
| `Resend__ApiKey` | Clave API de Resend con permiso de envío. Secreta. |
| `Resend__Remitente` | Dirección de un dominio verificado en Resend, por ejemplo `noreply@cozymov.com`. |
| `Resend__NombreRemitente` | Opcional. Por defecto `Cozymov`. |

Sin Resend, se envía por SMTP:

| Variable | Uso |
| --- | --- |
| `Smtp__Servidor` | Opcional. Por defecto `smtp.office365.com`. |
| `Smtp__Puerto` | Opcional. Por defecto `587` (STARTTLS); `465` usa TLS directo. |
| `Smtp__Usuario` | Cuenta que se autentica en el SMTP (por ejemplo, el correo de Outlook remitente). |
| `Smtp__Contrasena` | Contraseña (o contraseña de aplicación) de esa cuenta. Secreta. |
| `Smtp__Remitente` | Opcional. Dirección "De"; por defecto, `Smtp__Usuario`. Debe ser una dirección que el servidor permita enviar. |
| `Smtp__NombreRemitente` | Opcional. Por defecto `Cozymov`. |

En desarrollo usa User Secrets (`dotnet user-secrets set "Smtp:Usuario" ...`).
Sin Resend ni `Smtp:Usuario` y `Smtp:Contrasena`, enviar un código responde
503 y el log del backend lo explica. Si el servidor SMTP rechaza la autenticación, el log
muestra su mensaje (por ejemplo `5.7.139 Authentication unsuccessful`).

En Microsoft 365 el SMTP con contraseña debe estar habilitado para el buzón
(lo controla TI), no funciona si la cuenta exige MFA sin contraseña de
aplicación, y Microsoft lo desactiva por defecto desde diciembre de 2026.
Envía siempre por el SMTP del propio dominio del remitente: un remitente
`@unicesar.edu.co` enviado desde otro proveedor no pasa DMARC (`p=reject`).

En el backend, `Cors__OrigenesPermitidos` es opcional y está vacío por defecto:
el navegador no llama a la API directamente, así que no hace falta abrir CORS.

La única conexión directa del navegador al backend es el WebSocket de tiempo
real (`/hubs/tiempo-real`, fuera de `/api`), autenticado con un ticket de un solo
uso que entrega Next.js. Configura en el backend `TiempoReal__OrigenesPermitidos`
con el origen público del frontend (por ejemplo `https://cozymov.com`); si queda
vacío, ningún navegador conecta y la app usa solo HTTP. No hace falta CORS: el
cliente usa WebSocket sin negociación.

Al desplegar una versión del backend que protege rutas nuevas, publica primero
el frontend: una versión anterior que no envíe la clave en esas rutas recibiría
401.

Configúralas para los entornos de Vercel que uses (Production y Preview) y
vuelve a desplegar después de modificarlas. No uses `localhost` como URL del
backend en Vercel. Configura la misma `INTERNAL_API_KEY` como variable privada
en el servicio del backend; genera una clave aleatoria y no la publiques.

El backend configura su conexión a PostgreSQL mediante
`ConnectionStrings__Supabase` en el entorno donde está desplegado. No copies
`DATABASE_URL` al navegador ni la declares como `NEXT_PUBLIC_*`.

## Viajes y reservas

Las rutas de Next.js conservan las comprobaciones de sesión y reenvían las
operaciones a la API:

- `GET` y `POST /api/Viajes`: listar, filtrar y publicar viajes.
- `PUT` y `DELETE /api/Viajes/{id}`: editar y eliminar viajes.
- `POST /api/Viajes/{id}/reservar`: aceptar un viaje.
- `GET` y `DELETE /api/Viajes/reserva-activa/{idUsuario}`: consultar y cancelar
  la reserva activa.

La API aplica los filtros y escribe los viajes y reservas en PostgreSQL. La
migración `ViajesApiFields` agrega al modelo de viajes el vehículo, el punto de
encuentro y la información adicional. Las migraciones nuevas deben aplicarse a
la base de datos configurada para el backend antes de desplegar esa versión.
En desarrollo, el backend aplica migraciones automáticamente; en producción
se aplican como parte del proceso de despliegue. Para aplicarlas manualmente,
configura `ConnectionStrings__Supabase` para el proyecto Backend y ejecuta
desde la raíz:

```powershell
dotnet ef database update --project Backend\Backend.csproj --startup-project Backend\Backend.csproj
```

## Comprobaciones locales

Desde la raíz del repositorio:

```powershell
dotnet build Backend\Backend.csproj
npm --prefix Frontend run build
```
