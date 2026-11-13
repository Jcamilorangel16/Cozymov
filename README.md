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

El registro exige confirmar el correo antes de crear la cuenta:

1. El usuario escribe su correo `.edu.co` y pulsa **Confirmar correo**.
2. El backend genera un código de 6 dígitos (válido 10 minutos) y lo envía por
   Gmail SMTP. No se guarda nada en la tabla `Usuarios` todavía: solo queda un
   registro temporal en `registro_pendiente`.
3. El usuario ingresa el código en la ventana emergente. Si es correcto, el
   backend devuelve un token de un solo uso (válido 30 minutos).
4. Al pulsar **Siguiente**, el registro se envía con ese token. El backend
   comprueba el token, crea el usuario con `EmailVerificado = true` y elimina el
   registro pendiente dentro de una transacción.
5. El login rechaza con `403` a cualquier usuario con `EmailVerificado = false`.

Las cuentas que ya existían se marcan como verificadas al aplicar la migración
`VerificacionCorreo`, por lo que no quedan bloqueadas.

### Configurar Gmail SMTP

Gmail no acepta la contraseña normal de la cuenta: hay que crear una
**contraseña de aplicación** (requiere activar la verificación en dos pasos en
la cuenta de Google). Después se configuran los secretos del backend:

```powershell
dotnet user-secrets set "Smtp:Host" "smtp.gmail.com" --project Backend/Backend.csproj
dotnet user-secrets set "Smtp:Port" "587" --project Backend/Backend.csproj
dotnet user-secrets set "Smtp:User" "tucuenta@gmail.com" --project Backend/Backend.csproj
dotnet user-secrets set "Smtp:Password" "contraseña-de-aplicación" --project Backend/Backend.csproj
dotnet user-secrets set "Smtp:From" "tucuenta@gmail.com" --project Backend/Backend.csproj
dotnet user-secrets set "Smtp:FromName" "Cozymov" --project Backend/Backend.csproj
```

También se pueden usar variables de entorno (`Smtp__Host`, `Smtp__Port`,
`Smtp__User`, `Smtp__Password`, `Smtp__From`, `Smtp__FromName`). El frontend
necesita `VITE_API_URL` e `INTERNAL_API_KEY` en `Frontend/.env.local`.

Nota: el plan gratuito de Gmail permite unos 500 destinatarios al día y está
pensado para pruebas; para producción conviene un proveedor SMTP transaccional.

### Aplicar la migración

```powershell
dotnet ef database update --project Backend/Backend.csproj --startup-project Backend/Backend.csproj
```

En desarrollo el backend también aplica las migraciones pendientes al arrancar.

