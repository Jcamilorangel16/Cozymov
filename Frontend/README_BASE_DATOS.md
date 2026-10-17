# Base de datos PostgreSQL

La aplicación Next.js usa PostgreSQL para registrar usuarios y validar el inicio de sesión. Las consultas a la base se ejecutan en el servidor; el navegador nunca recibe la contraseña almacenada ni la URL de conexión.

## Configurar la conexión

La aplicación lee la variable de entorno `DATABASE_URL`.

- **Desarrollo local:** definirla en `Frontend/.env.local`.
- **Despliegue en Render:** agregarla en las variables de entorno del servicio web. Para usar Supabase, copiar su cadena de conexión PostgreSQL y mantener la contraseña privada.
- Mantener la URL privada. No pegarla en el código ni subirla al repositorio. Los archivos `.env*` están ignorados por Git.
- Si se cambia la URL, reiniciar el servidor local o volver a desplegar la aplicación.

Ejemplo sin credenciales reales:

```env
DATABASE_URL=postgresql://USUARIO:CLAVE@HOST/BASE?sslmode=require
```

`sslmode=require` solicita una conexión TLS. `Frontend/src/lib/db.ts` crea el pool de PostgreSQL de forma diferida y lo reutiliza entre solicitudes dentro de la instancia del servidor.

## Tabla de usuarios

El registro y el login usan la tabla `public.usuario`, creada desde el esquema definido por la aplicación:

| Columna | Uso |
| --- | --- |
| `id_usuario` | Identificador ingresado por la persona; clave primaria de hasta 20 caracteres |
| `primer_nombre` | Primer nombre |
| `segundo_nombre` | Segundo nombre opcional |
| `primer_apellido` | Primer apellido |
| `segundo_apellido` | Segundo apellido opcional |
| `edad` | Edad; mínimo 16 |
| `correo` | Correo institucional |
| `contrasena` | Hash bcrypt de la contraseña |
| `rol` | Se asigna automáticamente como `pasajero` |
| `ocupacion` | Ocupación ingresada por el usuario |
| `fecha_registro` | Fecha del registro |

En una base vacía de Supabase, ejecutar:

```sql
CREATE TABLE usuario (
  id_usuario VARCHAR(20) PRIMARY KEY,
  primer_nombre VARCHAR(50) NOT NULL,
  segundo_nombre VARCHAR(50),
  primer_apellido VARCHAR(50) NOT NULL,
  segundo_apellido VARCHAR(50),
  edad SMALLINT NOT NULL CHECK (edad >= 16),
  correo VARCHAR(150) NOT NULL UNIQUE,
  contrasena VARCHAR(255) NOT NULL,
  rol VARCHAR(20) NOT NULL,
  ocupacion VARCHAR(50) NOT NULL,
  fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

La clave primaria de `id_usuario` y la restricción `UNIQUE` de `correo` permiten que el endpoint responda con HTTP `409` si ya existe una cuenta.

## Flujo de registro

1. `src/features/register/pages/register.jsx` recopila identificador, primer y segundo nombre, primer y segundo apellido, edad, ocupación, correo y contraseña; los segundos nombres y apellidos son opcionales. La ocupación se elige entre estudiante, profesor u otro; al elegir otro se solicita especificarla.
2. El formulario envía los datos con `POST /api/registro`; ya no los guarda en `localStorage`.
3. `app/api/registro/route.ts` vuelve a validar los datos en el servidor, guarda cada nombre y apellido en su columna correspondiente, normaliza el correo, asigna `pasajero` como rol y genera un hash con `bcryptjs` antes de insertar en `usuario`.
4. La consulta SQL usa parámetros (`$1`, `$2`, etc.) para no concatenar los datos recibidos en el comando SQL.
5. Si el guardado funciona, la API responde con HTTP `201` y datos públicos del usuario. Nunca devuelve la contraseña ni su hash.

La contraseña debe tener al menos 8 caracteres y no superar el límite de 72 bytes de bcrypt.

## Flujo de inicio de sesión

1. `src/features/login/pages/Login.jsx` envía el correo y la contraseña con `POST /api/login`.
2. `app/api/login/route.ts` busca el correo en `usuario` y compara la contraseña recibida con el hash almacenado en `contrasena` usando `bcrypt.compare`.
3. Si coinciden, la API devuelve los datos públicos del usuario y el formulario navega a `/menu`. Si no, responde con HTTP `401`.

El hash se mantiene en el servidor y no se incluye en la respuesta del login.

## Registro de vehículos

1. Al iniciar sesión, el navegador conserva el identificador del usuario en `sessionStorage` durante esa sesión.
2. Al abrir la opción para ofrecer viajes, `src/features/ofrecer-viajes/components/OfrecerViajes.jsx` consulta `GET /api/vehiculo?id_usuario=...` para recuperar el vehículo guardado.
3. El formulario envía el vehículo con `POST /api/vehiculo`. La API valida los datos y guarda el vehículo y, para automóviles o motos, sus datos específicos en una transacción de PostgreSQL.
4. La API de vehículos requiere las tablas `VEHICULO`, `AUTOMOVIL` y `MOTO` del esquema `Database/002_extensiones_y_vehiculos.sql`.

La capacidad de pasajeros, el tipo, el modelo, la ruta cotidiana, el número de puertas (automóvil) y la modalidad (moto) se guardan en la base. La foto seleccionada en el formulario no se carga a la nube: la aplicación aún no tiene configurado un servicio de almacenamiento de archivos.

## Archivos de conexión y API

| Archivo | Responsabilidad |
| --- | --- |
| `src/lib/db.ts` | Construye y reutiliza el pool `pg`; informa si falta `DATABASE_URL`. |
| `app/api/registro/route.ts` | Valida e inserta usuarios, hasheando la contraseña. |
| `app/api/login/route.ts` | Lee al usuario por correo y compara su hash bcrypt. |
| `app/api/vehiculo/route.ts` | Consulta y registra vehículos en PostgreSQL. |
| `src/features/ofrecer-viajes/components/OfrecerViajes.jsx` | Consulta y envía los datos del vehículo a la API. |
| `src/features/register/pages/register.jsx` | Envía el formulario de registro a la API. |
| `src/features/login/pages/Login.jsx` | Envía el formulario de login a la API. |

## Ejecutar y comprobar

Desde la carpeta del repositorio:

```bash
npm --prefix Frontend run dev
npm --prefix Frontend run build
```

Para comprobar la tabla desde el editor SQL de Supabase sin leer datos de usuarios:

```sql
SELECT * FROM public.usuario LIMIT 0;
```

## Límites actuales

- El login valida las credenciales y navega a `/menu`, pero todavía no crea una cookie o sesión autenticada. Por eso, la API de login no basta para proteger las páginas privadas; hace falta implementar una sesión y verificarla en las rutas protegidas.
- Los usuarios que solo existían en el `localStorage` anterior no se migran automáticamente a PostgreSQL.
- Si las credenciales de la base se compartieron fuera de un gestor seguro, rotar la contraseña en Supabase y actualizar `DATABASE_URL` tanto localmente como en el servicio desplegado.