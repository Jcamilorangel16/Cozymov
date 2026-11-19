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

## Registro

El registro crea la cuenta directamente, sin confirmar el correo por código.
Fuera de Development solo se admiten correos institucionales que terminen en
`.edu.co`, y se limitan a cinco intentos de registro por IP cada hora. No hay
recuperación de contraseña por correo; la contraseña se cambia desde
Configuración conociendo la actual.

## Configuración local

En local, usa User Secrets:

```powershell
dotnet user-secrets set "INTERNAL_API_KEY" "una-clave-larga-y-aleatoria" --project Backend/Backend.csproj
```

En `Frontend/.env.local`, configura:

```text
VITE_API_URL=http://localhost:5146
INTERNAL_API_KEY=el-mismo-valor-configurado-en-el-backend
```

En el servidor, configura `INTERNAL_API_KEY` en el backend (Render) y
`VITE_API_URL` e `INTERNAL_API_KEY` en Vercel.

Inicia el backend (`dotnet run --project Backend/Backend.csproj`) y el
frontend (`npm --prefix Frontend run dev`).

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

