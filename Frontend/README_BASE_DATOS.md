# Base de datos PostgreSQL

La aplicación Next.js usa PostgreSQL alojado en Render para registrar usuarios y validar el inicio de sesión. Las consultas a la base se ejecutan en el servidor; el navegador nunca recibe la contraseña almacenada ni la URL de conexión.

## Configurar la conexión

La aplicación lee la variable de entorno `DATABASE_URL`.

- **Desarrollo local:** definirla en `Frontend/.env.local`.
- **Despliegue en Render:** agregarla en las variables de entorno del servicio web. Si la aplicación también está en Render, usar la URL interna de la base de datos.
- Mantener la URL privada. No pegarla en el código ni subirla al repositorio. Los archivos `.env*` están ignorados por Git.
- Si se cambia la URL, reiniciar el servidor local o volver a desplegar la aplicación.

Ejemplo sin credenciales reales:

```env
DATABASE_URL=postgresql://USUARIO:CLAVE@HOST/BASE?sslmode=require
```

`sslmode=require` solicita una conexión TLS. `Frontend/src/lib/db.ts` crea el pool de PostgreSQL de forma diferida y lo reutiliza entre solicitudes dentro de la instancia del servidor.

## Tabla de usuarios

La base de Render ya tiene la tabla `public.usuarios`. El registro y el login esperan estas columnas:

| Columna | Uso |
| --- | --- |
| `id` | Identificador devuelto al iniciar sesión |
| `nombres` | Nombres del usuario |
| `apellidos` | Apellidos del usuario |
| `documento` | Documento de identidad |
| `telefono` | Número de teléfono |
| `correo` | Correo institucional |
| `contrasena` | Hash bcrypt de la contraseña |
| `fecha_registro` | Fecha del registro |

El siguiente SQL es solo una referencia para una base nueva. No ejecutarlo encima de una tabla existente sin comparar primero el esquema:

```sql
CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  documento TEXT NOT NULL UNIQUE,
  telefono TEXT NOT NULL,
  correo TEXT NOT NULL UNIQUE,
  contrasena TEXT NOT NULL,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Las restricciones `UNIQUE` en `documento` y `correo` permiten que el endpoint identifique los duplicados y responda con HTTP `409`.

## Flujo de registro

1. `src/features/register/pages/register.jsx` valida que el formulario esté completo, que las contraseñas coincidan y que el correo termine en `.edu.co`.
2. El formulario envía los datos con `POST /api/registro`; ya no los guarda en `localStorage`.
3. `app/api/registro/route.ts` vuelve a validar los datos en el servidor, normaliza el correo y genera un hash con `bcryptjs` antes de insertar.
4. La consulta SQL usa parámetros (`$1`, `$2`, etc.) para no concatenar los datos recibidos en el comando SQL.
5. Si el guardado funciona, la API responde con HTTP `201` y datos públicos del usuario. Nunca devuelve la contraseña ni su hash.

La contraseña debe tener al menos 8 caracteres y no superar el límite de 72 bytes de bcrypt.

## Flujo de inicio de sesión

1. `src/features/login/pages/Login.jsx` envía el correo y la contraseña con `POST /api/login`.
2. `app/api/login/route.ts` busca el correo en `usuarios` y compara la contraseña recibida con el hash almacenado usando `bcrypt.compare`.
3. Si coinciden, la API devuelve los datos públicos del usuario y el formulario navega a `/menu`. Si no, responde con HTTP `401`.

El hash se mantiene en el servidor y no se incluye en la respuesta del login.

## Archivos de conexión y API

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/db.ts` | Construye y reutiliza el pool `pg`; informa si falta `DATABASE_URL`. |
| `app/api/registro/route.ts` | Valida e inserta usuarios, hasheando la contraseña. |
| `app/api/login/route.ts` | Lee al usuario por correo y compara su hash bcrypt. |
| `src/features/register/pages/register.jsx` | Envía el formulario de registro a la API. |
| `src/features/login/pages/Login.jsx` | Envía el formulario de login a la API. |

## Ejecutar y comprobar

Desde la carpeta del repositorio:

```bash
npm --prefix Frontend run dev
npm --prefix Frontend run build
```

Para comprobar las columnas de la tabla desde el editor SQL de Render sin leer datos de usuarios:

```sql
SELECT * FROM public.usuarios LIMIT 0;
```

## Límites actuales

- El login valida las credenciales y navega a `/menu`, pero todavía no crea una cookie o sesión autenticada. Por eso, la API de login no basta para proteger las páginas privadas; hace falta implementar una sesión y verificarla en las rutas protegidas.
- Los usuarios que solo existían en el `localStorage` anterior no se migran automáticamente a PostgreSQL.
- Si las credenciales de la base se compartieron fuera de un gestor seguro, rotar la contraseña en Render y actualizar `DATABASE_URL` tanto localmente como en el servicio desplegado.