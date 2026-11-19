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

El correo se envía por **SMTP** (recomendado) o por la API HTTP de **Brevo**; el
mecanismo se elige por configuración (ver más abajo). En desarrollo, si el envío
no está configurado, el código se escribe en el log del backend. En los demás
ambientes la API responde `503`; si el servidor de correo falla, la API responde
`502`. La clave `Jwt:Clave` es obligatoria para firmar y
verificar el comprobante; se deriva una clave independiente para HMAC y no se
usa como clave del JWT ni se sustituye por `INTERNAL_API_KEY`.

Las cuentas que ya existían se marcan como verificadas al aplicar la migración
`VerificacionCorreo`, por lo que no quedan bloqueadas.

### Configurar el envío por SMTP

El backend usa SMTP cuando existe `Correo:Smtp:Host` (o `Correo:Proveedor=smtp`).
Los datos del proveedor (host, puerto, usuario, contraseña y modo de cifrado) los
entrega quien administra la cuenta de correo; **no están en el repositorio** y no
deben escribirse en el código, en el frontend ni en commits. El navegador nunca
recibe estas variables: solo las lee el backend.

| Variable de entorno | User Secrets | Descripción |
|---|---|---|
| `Correo__Proveedor` | `Correo:Proveedor` | Opcional: `smtp` o `brevo`. Sin ella, se usa SMTP si hay host. |
| `Correo__Smtp__Host` | `Correo:Smtp:Host` | Servidor SMTP del proveedor. |
| `Correo__Smtp__Puerto` | `Correo:Smtp:Puerto` | Opcional: 587 con `StartTls`, 465 con `Ssl`, 25 con `Ninguna`. |
| `Correo__Smtp__Usuario` | `Correo:Smtp:Usuario` | Usuario de autenticación (junto con la contraseña). |
| `Correo__Smtp__Password` | `Correo:Smtp:Password` | Contraseña o contraseña de aplicación. |
| `Correo__Smtp__Seguridad` | `Correo:Smtp:Seguridad` | `StartTls` (por defecto), `Ssl` o `Ninguna` (solo en Development). |
| `Correo__Remitente` | `Correo:Remitente` | Dirección remitente; debe ser válida (se rechaza, por ejemplo, `unicesar..edu.co`). |
| `Correo__NombreRemitente` | `Correo:NombreRemitente` | Opcional; `Cozymov` por defecto. |

Por compatibilidad también se leen estos nombres alternativos cuando falta el
equivalente `Correo:*`: `Smtp:Host`, `Smtp:Port`, `Smtp:User`, `Smtp:Password`,
`Smtp:From` y `Smtp:FromName`. Sin modo de seguridad explícito, el puerto 465 usa
`Ssl` y cualquier otro usa `StartTls`. El remitente debe pertenecer a la cuenta que
autentica en el servidor: Gmail, por ejemplo, reescribe o rechaza un remitente que
no sea la propia cuenta o un alias suyo.

El remitente confirmado para este proyecto es `jdvasquezaltamiranda@unicesar.edu.co`.
Si la configuración es inválida (host ausente, remitente mal formado, puerto fuera
de rango, usuario sin contraseña o modo de cifrado desconocido), el backend no
envía y responde `503` sin revelar detalles; los motivos se registran en el log
sin incluir contraseñas. Los fallos de conexión, TLS o autenticación se registran
y responden `502`. En la recuperación de contraseña el fallo nunca se revela al
cliente, para no distinguir cuentas.

En local, con User Secrets:

```powershell
dotnet user-secrets set "Correo:Smtp:Host" "<host-del-proveedor>" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Smtp:Puerto" "<puerto>" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Smtp:Seguridad" "StartTls" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Smtp:Usuario" "<usuario>" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Smtp:Password" "<contraseña>" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Remitente" "jdvasquezaltamiranda@unicesar.edu.co" --project Backend/Backend.csproj
```

En el servidor (Render u otro), define las mismas variables con el formato
`Correo__Smtp__Host`, etc. Cada correo incluye el código, su vigencia de 10
minutos y la instrucción de escribirlo en la pantalla de registro.

### Configurar la API de Brevo (alternativa)

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

Para probar sin enviar correos, deja vacíos `Correo:Smtp:Host` y `Correo:BrevoApiKey`:
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
3. Sin SMTP ni Brevo en Development, lee el código de los logs del backend; con
   el envío configurado, revisa el correo y la carpeta de spam.
4. Completa el registro antes de que transcurran los 10 minutos. Cambia el correo
   al volver al formulario para solicitar un código nuevo; el botón de reenvío
   también inicia una solicitud nueva.

Las pruebas automatizadas se ejecutan con:

```powershell
dotnet test Backend.Tests/Backend.Tests.csproj
npm --prefix Frontend run test
npm --prefix Frontend run lint
```

### Aplicar la migración

```powershell
dotnet ef database update --project Backend/Backend.csproj --startup-project Backend/Backend.csproj
```

En desarrollo el backend también aplica las migraciones pendientes al arrancar.

