# Contexto del proyecto para Claude

## Qué es Cozymov

Cozymov es una aplicación web para coordinar viajes compartidos dentro de una
comunidad universitaria. Este repositorio contiene el frontend y la API. El
desarrollador puede tener además una bóveda local de Obsidian.

Antes de cambiar código, lee este archivo y las instrucciones más cercanas al
archivo que vas a modificar:

- Frontend: [`Frontend/CLAUDE.md`](Frontend/CLAUDE.md) importa
  [`Frontend/AGENTS.md`](Frontend/AGENTS.md). La guía local exige consultar la
  documentación instalada de Next.js en `Frontend/node_modules/next/dist/docs/`
  antes de cambiar código de Next.
- Persistencia, despliegue y configuración de datos:
  [`Frontend/README_BASE_DATOS.md`](Frontend/README_BASE_DATOS.md).
- API y modelos de vehículos: [`README_VEHICULOS.md`](README_VEHICULOS.md).
- Notas locales de Obsidian, si existen:
  `Tablas_ccozy/Bienvenido.md` y `Tablas_ccozy/Grafo relacional.canvas`.

## Cómo usar este contexto con Claude

- **Claude Code:** abre el proyecto desde la raíz del repositorio; Claude Code
  detecta `CLAUDE.md` como contexto del proyecto.
- **Claude Desktop:** agrega este archivo al conocimiento del proyecto o
  adjúntalo al iniciar la conversación y pídele a Claude que lo lea antes de
  proponer o realizar cambios.
- Este archivo orienta, pero el código y las migraciones actuales son la
  fuente de verdad. Si difieren, verifica el repositorio y actualiza este
  contexto.

## Arquitectura

```text
Frontend/   Next.js App Router, interfaz, sesiones y rutas proxy
Backend/    ASP.NET Core Web API, Entity Framework Core y PostgreSQL
Tablas_ccozy/ Bóveda Obsidian local opcional, ignorada por Git
```

- El frontend usa Next.js 16, React 19, JavaScript y TypeScript. Las páginas y
  rutas HTTP están en `Frontend/app/`; las funcionalidades de UI están
  agrupadas por dominio en `Frontend/src/features/`; utilidades comunes están
  en `Frontend/src/lib/` y `Frontend/src/hooks/`.
- El backend usa .NET 10, ASP.NET Core, EF Core y el proveedor Npgsql para
  PostgreSQL. `Backend/Data/AppDbContext.cs` registra las entidades y
  `Backend/Data/Configurations/` define las relaciones y restricciones. Las
  migraciones están en `Backend/Migrations/`.
- En los flujos migrados, el frontend valida la sesión y reenvía solicitudes a
  la API, incluida la recuperación de contraseña.
- `Tablas_ccozy/` es una bóveda local opcional de Obsidian y está ignorada por
  Git. No presupongas que existe después de clonar el repositorio ni uses sus
  notas como única fuente de información.

## Funcionalidades implementadas

- Registro con verificación de correo: código de seis dígitos, expiración,
  comprobante firmado por HMAC, límite de solicitudes y envío mediante Brevo.
  La implementación y configuración detalladas están en
  [`Frontend/CLAUDE.md`](Frontend/CLAUDE.md) y
  `Backend/Controllers/RegistroController.cs`.
- Inicio y cierre de sesión, sesión firmada en el servidor y rutas protegidas.
- Perfil y configuración de usuario.
- Publicación, búsqueda, consulta y edición de viajes; aceptación y cancelación
  de reservas.
- Registro y consulta de vehículos, con detalles separados para automóvil,
  moto y bicicleta eléctrica.
- Mensajería: contactos, conversaciones, mensajes y estado de lectura.
- Teléfonos y preferencias de movilidad desde Configuración.
- Solicitudes de viaje: creación, consulta, edición, eliminación y consulta de
  viajes coincidentes por ruta, día, presupuesto y hora límite.
- Calificaciones: consulta de recibidas y enviadas, promedio, creación para
  una reserva propia completada y eliminación de calificaciones propias.
- Recuperación de contraseña: el proxy `Frontend/app/api/recuperar-contrasena`
  reenvía a `Backend/Controllers/RecuperacionController.cs`
  (`/api/recuperacion/solicitar` y `/restablecer`). Código de 6 dígitos
  enviado por Brevo, guardado como HMAC en `Usuarios` (migración
  `RecuperacionContrasena`), vigencia de 10 min, un solo uso, 5 intentos,
  espera de 60 s entre envíos y respuestas que no revelan si el correo existe.

Rutas de API de backend destacadas: `/api/Usuarios`, `/api/registro`,
`/api/Viajes`, `/api/rutas`, `/api/vehiculos`, `/api/automoviles`,
`/api/motos`, `/api/bicicletas-electricas`, `/api/Mensajes`, `/api/telefonos`,
`/api/preferencias`, `/api/solicitudes` y `/api/calificaciones`. Revisa los
controladores para verbos, parámetros y DTOs exactos.

## Modelo relacional actual

Las entidades principales (más las cuatro del PDF descritas abajo) son `Usuarios`, `Viaje`, `ReservaViaje`, `Ruta`,
`Mensaje`, `Vehiculo`, `Automovil`, `Moto` y `Bicicleta` (tabla
`bicicleta_electrica`).

- Un usuario puede tener varios vehículos y publicar varios viajes. La
  eliminación del usuario se restringe cuando existen estos registros.
- Cada viaje pertenece a un usuario, que es su conductor (`viaje.IdUsuario`).
  `viaje` ya no tiene `id_conductor` ni `id_vehiculo`: el vehículo que se
  muestra en un viaje es el primero del conductor en la tabla `vehiculo`.
- `viaje.IdRuta` es opcional; al borrar una ruta con viajes relacionados, la
  eliminación se restringe.
- Al borrar un vehículo, los viajes de su dueño no se ven afectados (no hay FK
  entre `viaje` y `vehiculo`; la migración `QuitarConductorVehiculoViaje` la
  eliminó junto con las columnas).
- Una reserva vincula un viaje con el usuario pasajero. Al borrar un viaje, sus
  reservas se eliminan en cascada. Los índices únicos parciales evitan reservas
  activas repetidas del mismo pasajero.
- Los mensajes tienen dos relaciones independientes con usuarios:
  `IdEmisor` e `IdReceptor`.
- `automovil`, `moto` y `bicicleta_electrica` usan la clave primaria de
  `vehiculo` como clave foránea compartida; sus detalles se eliminan en cascada.
  La base no impone exclusividad entre los tres tipos.
- `telefono_usuario` permite varios teléfonos por usuario y se elimina en
  cascada junto con el usuario.
- `preferencia` es opcional, con una fila por usuario (PK/FK `id_usuario`) y
  eliminación en cascada.
- `solicitud` referencia a un usuario y una ruta; las relaciones restringen el
  borrado de entidades referenciadas.
- `calificacion` referencia una reserva, un evaluador y un evaluado. El borrado
  de la reserva elimina sus calificaciones; el CHECK limita la puntuación a
  1–5.
- Los valores de origen y destino en un viaje son texto; no equivalen a una FK
  a `ruta`.

Las migraciones relevantes son `EliminarRegistroPendiente`,
`20261115000000_ViajeVehiculo` y `TablasFaltantesPdf`. `ViajeVehiculo` agrega la
FK opcional de vehículo y limpia referencias huérfanas antes de crearla. En la
base consultada durante el último trabajo, EF informó que estas migraciones ya
estaban aplicadas; **verifica el ambiente objetivo antes de actualizar otra
base de datos**. No asumas que desarrollo, pruebas y producción tienen el mismo
estado.

## Frontend de las tablas del PDF

- La navegación principal incluye Solicitudes y Calificaciones. Teléfonos y
  preferencias están agrupados bajo Configuración > Contacto y preferencias.
- `Frontend/app/api/rutas/route.ts` expone las rutas al navegador mediante una
  ruta proxy autenticada; la interfaz no llama al backend directamente ni
  expone `INTERNAL_API_KEY`.
- `Frontend/src/features/solicitudes/components/SolicitudesView.jsx` usa
  `/api/solicitudes` para CRUD y coincidencias, y `/api/rutas` para elegir la
  ruta.
- `Frontend/src/features/configuracion/components/ContactoPreferencias.jsx`
  consume `/api/telefonos` y `/api/preferencias`. La identidad del usuario la
  establece el proxy desde la sesión.
- `Frontend/src/features/calificaciones/components/CalificacionesView.jsx`
  consulta recibidas, enviadas y resumen; permite borrar solo valoraciones
  propias y muestra el formulario solo para reservas completadas sin calificar.
- El proxy `Frontend/app/api/viajes/en-curso/route.ts` expone GET (reserva activa),
  POST (finalizar) y DELETE (cancelar). El ID numérico del conductor para
  calificar viene de `/api/viajes/completados`.

## Ejecutar y validar

Desde la raíz del repositorio:

```powershell
dotnet run --project Backend/Backend.csproj
npm --prefix Frontend run dev
npm --prefix Frontend run lint
npm --prefix Frontend run test
npm --prefix Frontend run build
dotnet test Backend/Tests/Backend.Tests.csproj
dotnet build Backend/Backend.csproj
```

La API requiere una cadena PostgreSQL `ConnectionStrings:Supabase`. En
desarrollo aplica las migraciones al iniciar; producción debe desplegar las
migraciones explícitamente. Para aplicar las migraciones manualmente:

```powershell
dotnet ef database update --project Backend/Backend.csproj --startup-project Backend/Backend.csproj
```

## Estado conocido y precauciones

- El conflicto anterior de `Backend/Controllers/UsuariosController.cs` ya fue
  resuelto; el último build del backend y sus 42 pruebas pasaron. Si se retoca
  ese controlador, vuelve a compilar y probar.
- El frontend pasó `npm --prefix Frontend run build` y sus 15 pruebas. ESLint
  terminó sin errores; informó tres advertencias existentes: un `<img>` en
  `BuscarViajes.jsx` y dos valores sin uso en `MenuPrincipal.jsx`.
- La revisión visual del último trabajo llegó a la pantalla de inicio de
  sesión; no había una sesión autenticada disponible para inspeccionar las
  nuevas vistas.
- El árbol de trabajo puede contener cambios locales no relacionados en
  backend, frontend y Obsidian. Antes de editar o limpiar, revisa `git status`
  y conserva los cambios que no sean parte de la tarea actual.
- No leas, copies, imprimas ni incluyas valores de archivos `.env*`, User
  Secrets, cadenas de conexión, claves o credenciales en documentación,
  respuestas o commits. Los nombres de variables se documentan sin sus valores.
- No hagas cambios destructivos en la base de datos ni ejecutes migraciones
  contra una instancia compartida sin autorización y confirmación del ambiente.
- Mantén modelos, configuraciones EF, DTOs, controladores, migraciones y notas
  locales de Obsidian (si existen) consistentes cuando cambie el esquema.
- Prefiere cambios pequeños. Añade o actualiza pruebas enfocadas y ejecuta la
  validación más específica disponible. Reporta bloqueos y fallos preexistentes
  sin ocultarlos.

## Tablas del PDF de diseño (Entrega 2)

La migración `TablasFaltantesPdf` agrega `telefono_usuario` (cascade desde
usuario), `preferencia` (PK/FK `id_usuario`, cascade), `solicitud` (restrict
hacia usuario y ruta) y `calificacion` (cascade desde `reserva_viaje`, restrict
hacia evaluador y evaluado, CHECK de puntuación 1–5). Sus controladores son
`/api/telefonos`, `/api/preferencias/{idUsuario}`, `/api/solicitudes` (con
`{id}/coincidencias`) y `/api/calificaciones` (con `resumen/{idEvaluado}`);
los DTOs están en `Backend/DTOs/`. Diferencias deliberadas con el PDF: un usuario puede
tener varios vehículos y `viaje` no guarda conductor en texto ni vehículo. La regla de
cupos ≤ capacidad del vehículo (trigger) y la exclusividad automóvil/moto
siguen pendientes.

### Autorización de la API

Toda ruta bajo `/api` del backend exige `X-Internal-Api-Key`
(`InternalApiMiddleware` deniega por defecto), de modo que solo el servidor de
Next.js puede llamarla; un controlador nuevo queda protegido sin tocar el
middleware. El navegador usa las rutas proxy de `Frontend/app/api/`, que toman
el usuario de la sesión (`src/lib/proxyUsuario.ts`), nunca del cliente, y
verifican la propiedad antes de editar o borrar (`?id=`). La autorización por
usuario vive en esos proxies: el backend confía en quien presenta la clave.
Toda llamada al backend debe salir de `getBackendApiConfig()` para incluir la
clave.

### Medidas de seguridad vigentes

- `Frontend/proxy.ts` rechaza los POST/PUT/DELETE a `/api` cuyo `Origin` no sea
  el de la propia app (CSRF). `ORIGENES_PERMITIDOS` admite orígenes extra.
- `Frontend/next.config.ts` envía CSP, `X-Frame-Options`, HSTS y afines. Si se
  añade un recurso externo (script, fuente, API llamada desde el navegador),
  hay que permitirlo en la CSP.
- `SESSION_SECRET` debe tener al menos 32 caracteres (`src/lib/auth.ts`).
- La sesión queda iniciada en el dispositivo: la cookie `sesion` (httpOnly,
  SameSite=Lax, `secure` en producción) dura un año y `POST /api/sesion` la
  renueva cada vez que se abre el menú. Cerrar sesión solo borra la cookie de
  ese dispositivo: el JWT es sin estado y no se puede revocar antes de que
  venza, así que si se roba una cookie sirve hasta entonces (ver
  `INFORME_SEGURIDAD.md`). `MenuPrincipal` alinea `sessionStorage` con el id
  verificado por el servidor porque la sesión sobrevive al reinicio del
  navegador y `sessionStorage` no.
- Inicio de sesión y cambio de contraseña se bloquean 15 min tras 8 fallos por
  cuenta (`Backend/Services/LimitadorIntentos.cs`, en memoria) y el login tiene
  además un límite por IP. Los límites por IP usan la cabecera `X-Cliente-Ip`
  que envía `cabecerasIpCliente()` (`src/lib/backendApi.ts`).
- Los errores 5xx del backend no se reenvían al navegador
  (`mensajeErrorSeguro()`).
- CORS del backend está cerrado salvo `Cors:OrigenesPermitidos`.
- Las falencias pendientes están en [`INFORME_SEGURIDAD.md`](INFORME_SEGURIDAD.md).

### Finalización de viajes y calificaciones

El pasajero finaliza su viaje desde la vista "Viaje en curso" (botón
"Finalizar viaje"): `POST /api/viajes/en-curso` en el proxy llama a
`POST /api/Viajes/reserva-activa/{id}/finalizar`, que pasa la reserva de
`activa` a `completada` sin liberar el cupo ni cambiar el estado del viaje
(otros pasajeros pueden seguir en él). `GET /api/Viajes/reservas-completadas/{id}`
(proxy `Frontend/app/api/viajes/completados`) alimenta la pantalla de
calificaciones, que lista las reservas completadas aún sin calificar. El backend
exige `reserva.Estado == "completada"` para aceptar una calificación. Hoy solo
el pasajero califica al conductor desde la UI; el backend admite también la
dirección inversa.

### Calificaciones anónimas

Las calificaciones recibidas son anónimas. El proxy `Frontend/app/api/calificaciones`
(GET sin `emitidas`) devuelve solo `idCalificacion`, `puntuacion` y `comentario`;
omite `idEvaluador` e `idReserva`, que permitirían identificar a quien calificó.
El evaluador sí ve sus calificaciones enviadas completas (para borrarlas). El
backend conserva el evaluador en la base por integridad; el anonimato se aplica
en el proxy, así que no expongas esos campos desde otra ruta.
