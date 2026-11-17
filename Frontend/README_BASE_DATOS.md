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

En el backend, `Cors__OrigenesPermitidos` es opcional y está vacío por defecto:
el navegador no llama a la API directamente, así que no hace falta abrir CORS.

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

## Recuperación de contraseña

La recuperación de contraseña quedó fuera de la migración actual: su endpoint
de Next.js todavía consulta PostgreSQL directamente y la pantalla aún no está
conectada a ese endpoint ni tiene configurado el envío de correo. Mientras se
migre ese flujo, su endpoint puede seguir necesitando `DATABASE_URL` en el
entorno del frontend. Por tanto, para quitar completamente esa variable de
Vercel habrá que migrar o deshabilitar también la recuperación de contraseña.

## Comprobaciones locales

Desde la raíz del repositorio:

```powershell
dotnet build Backend\Backend.csproj
npm --prefix Frontend run build
```
