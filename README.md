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
como al crear la cuenta. Se limitan a cinco envíos/verificaciones por IP cada
15 minutos.

En desarrollo, si Brevo no está configurado, el código se escribe en el log del
backend. En los demás ambientes la API responde `503`; por eso las variables
deben estar configuradas en el servidor **antes de publicar**, o nadie podrá
registrarse.

Las cuentas que ya existían se marcan como verificadas al aplicar la migración
`VerificacionCorreo`, por lo que no quedan bloqueadas.

### Configurar la API de Brevo

1. Crea una cuenta en Brevo.
2. Verifica una dirección remitente (o autentica el dominio remitente).
3. Genera una API key desde la configuración SMTP & API de Brevo.
4. Configura la API key y el remitente verificado para el backend.

En local, usa User Secrets:

```powershell
dotnet user-secrets set "Correo:BrevoApiKey" "tu-clave-api-de-brevo" --project Backend/Backend.csproj
dotnet user-secrets set "Correo:Remitente" "correo-verificado@tudominio.com" --project Backend/Backend.csproj
```

En el servidor, configura estas variables de entorno antes del despliegue:

```text
Correo__BrevoApiKey=tu-clave-api-de-brevo
Correo__Remitente=correo-verificado@tudominio.com
```

Los correos podrían llegar a spam si el dominio del remitente no está
autenticado en Brevo. El nombre del remitente es `Cozymov` por defecto y puede
cambiarse con `Correo__NombreRemitente`. El frontend también necesita
`VITE_API_URL` e `INTERNAL_API_KEY` en `Frontend/.env.local`.

### Aplicar la migración

```powershell
dotnet ef database update --project Backend/Backend.csproj --startup-project Backend/Backend.csproj
```

En desarrollo el backend también aplica las migraciones pendientes al arrancar.

