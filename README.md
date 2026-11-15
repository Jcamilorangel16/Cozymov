# Cozymov

Aplicación de viajes compartidos para una comunidad universitaria. El frontend
está implementado con Next.js App Router y sus detalles de estructura y
desarrollo están documentados en [Frontend/README.md](./Frontend/README.md).

```text
Cozymov/
├── Frontend/
│   ├── app/             # Rutas App Router y endpoints de API
│   ├── src/features/    # Funcionalidades organizadas por dominio
│   ├── src/hooks/       # Hooks compartidos
│   └── src/lib/         # Base de datos y sesión
├── public/              # Recursos públicos usados por el frontend
└── README.md            # Resumen del repositorio
```

Los comandos de desarrollo, lint y compilación se ejecutan desde `Frontend/`.

## Verificación del correo institucional

El registro exige confirmar el correo antes de crear la cuenta. El código de 6
dígitos vence a los 10 minutos y no se guarda en la base de datos. El backend
devuelve un comprobante HMAC firmado; lo valida tanto al confirmar el código
como al crear la cuenta. Se limitan a cinco solicitudes a los endpoints de código por IP cada 15
minutos, y a cinco intentos de registro por IP cada hora.

En desarrollo, si Brevo no está configurado, el código se escribe en el log del
backend. En los demás ambientes la API responde `503`; si Brevo responde con
error, la API responde `502`. La clave `Jwt:Clave` es obligatoria para firmar y
verificar el comprobante; se deriva una clave independiente para HMAC y no se
usa como clave del JWT ni se sustituye por `INTERNAL_API_KEY`.

Las cuentas que ya existían se marcan como verificadas al aplicar la migración
`VerificacionCorreo`, por lo que no quedan bloqueadas.

### Configurar la API de Brevo

1. Crea una cuenta en Brevo.
2. Verifica una dirección remitente (o autentica el dominio remitente).
3. Genera una API key desde la configuración SMTP & API de Brevo.
4. Configura la API key y el remitente verificado para el backend.

En local, usa User Secrets:

```powershell
dotnet user-secrets set "Jwt:Clave" "un-secreto-largo-y-aleatorio" --project Backend/Backend.csproj
dotnet user-secrets set "INTERNAL_API_KEY" "otra-clave-larga-y-aleatoria" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:BrevoApiKey" "tu-clave-api-de-brevo" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Remitente" "correo-verificado@tudominio.com" --project Backend/Backend.csproj
```

En `Frontend/.env.local`, configura:

```text
VITE_API_URL=http://localhost:5146
INTERNAL_API_KEY=el-mismo-valor-configurado-en-el-backend
```

Para probar sin Brevo, deja `Correo:BrevoApiKey` y `Correo:Remitente` vacíos:
en Development el backend registra el código en su log. Mantén configuradas
`Jwt:Clave` e `INTERNAL_API_KEY`; la primera firma el comprobante y la segunda
protege la API interna.

En el servidor, configura estas variables de entorno antes del despliegue:

```text
Jwt__Clave=un-secreto-largo-y-aleatorio
INTERNAL_API_KEY=otra-clave-larga-y-aleatoria
Correo__BrevoApiKey=tu-clave-api-de-brevo
Correo__Remitente=correo-verificado@tudominio.com
```

Los correos podrían llegar a spam si el dominio del remitente no está
autenticado en Brevo. El nombre del remitente es `Cozymov` por defecto y puede
cambiarse con `Correo__NombreRemitente`. En Vercel configura `VITE_API_URL` e
`INTERNAL_API_KEY`; en Render configura `Jwt__Clave`, `INTERNAL_API_KEY` y las
variables de Brevo. No reutilices el mismo valor para las dos claves secretas.

El comprobante es sin estado: el backend no conserva el código ni invalida
comprobantes anteriores al reenviar. La cuenta sí solo puede crearse una vez
por correo (restricción de registro existente), pero el código no es de un solo
uso criptográfico; hacerlo de un solo uso requeriría guardar estado de consumo,
contrario al requisito de no persistir el código.

### Ejecutar y probar el flujo local

1. Configura los User Secrets y `Frontend/.env.local` como se indica arriba.
2. Inicia el backend (`dotnet run --project Backend/Backend.csproj`) y el
   frontend (`npm --prefix Frontend run dev`).
3. Sin Brevo en Development, lee el código de los logs del backend; con Brevo
   configurado, revisa el correo y la carpeta de spam.
4. Completa el registro antes de que transcurran los 10 minutos. Cambia el correo
   al volver al formulario para solicitar un código nuevo; el botón de reenvío
   también inicia una solicitud nueva.

Las pruebas automatizadas se ejecutan con:

```powershell
dotnet test Backend/Tests/Backend.Tests.csproj
npm --prefix Frontend run test
npm --prefix Frontend run lint
```

### Aplicar la migración

```powershell
dotnet ef database update --project Backend/Backend.csproj --startup-project Backend/Backend.csproj
```

En desarrollo el backend también aplica las migraciones pendientes al arrancar.

