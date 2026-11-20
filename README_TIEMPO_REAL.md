# Tiempo real (SignalR)

Cozymov usa SignalR solo para **avisar de cambios** que la otra persona necesita ver
al instante. Los datos se siguen leyendo y escribiendo con las APIs HTTP de siempre, y
PostgreSQL sigue siendo la fuente de verdad. Si la conexión no está disponible, la app
funciona como antes, con sus consultas periódicas.

## Qué usa tiempo real y qué sigue en HTTP

| Funcionalidad | Con conexión | Sin conexión (respaldo) |
| --- | --- | --- |
| Conversación abierta: mensajes nuevos | Evento `MensajeNuevo`; se pinta al llegar y se marca leído con el `GET` de siempre | `GET /api/mensajes` cada 4 s |
| Confirmación de lectura (doble marca ✓✓) | Evento `MensajesLeidos` | Se ve al volver a consultar |
| Lista de chats (último mensaje, sin leer) | Se vuelve a pedir al recibir `MensajeNuevo`/`MensajesLeidos` | Al entrar en la vista (como antes) |
| Aviso de mensaje nuevo en cualquier sección | Evento `MensajeNuevo` | `GET /api/mensajes/chats` cada 10 s |
| Ir a «En curso» cuando aceptan un viaje | Evento `ViajeActualizado` → `GET /api/viajes/en-curso` | `GET /api/viajes/en-curso` cada 15 s |
| «En curso»: la otra parte sale, finaliza, cancela o edita | Evento `ViajeActualizado` → `GET /api/viajes/en-curso` y aviso | Al volver a abrir la vista (como antes) |

Siguen solo en HTTP: carga inicial, historial, CRUD, búsqueda de viajes, solicitudes
pendientes para conductores (consulta cada 20 s), calificaciones, perfil y
configuración. Ninguna operación se hace por el WebSocket: el Hub no tiene métodos
invocables.

## Arquitectura

```text
Navegador ──POST /api/tiempo-real/ticket (cookie de sesión)──▶ Next.js
                                                                │ verifica la sesión
                                                                ▼
                     POST /api/tiempo-real/tickets {idUsuario} + X-Internal-Api-Key
                                                                ▼
Navegador ◀──────────── { ticket, url } ─────────────────────── Backend (AlmacenTicketsTiempoReal)

Navegador ══WebSocket wss://<backend>/hubs/tiempo-real?access_token=<ticket>══▶ TiempoRealHub

Controlador ─SaveChanges/Commit─▶ PostgreSQL
     └─ después ─▶ INotificadorTiempoReal ─▶ Clients.Users(ids sacados de la base)
```

El navegador conecta **directamente con el backend**: las funciones de Vercel no
mantienen WebSockets (lo advierte la guía instalada de Next.js,
`backend-for-frontend.md`). Por eso la URL pública del backend queda visible para el
navegador. Antes solo la conocía el servidor de Next.js. Las rutas `/api` siguen
cerradas con `X-Internal-Api-Key`.

Archivos principales:

- Backend: `Backend/TiempoReal/` (Hub, tickets, autenticación, origen, notificador,
  contratos), `Backend/Controllers/TiempoRealController.cs` y las llamadas a
  `INotificadorTiempoReal` en `MensajesController`, `ViajesController` y
  `SolicitudesController`.
- Frontend: `app/api/tiempo-real/ticket/route.ts`, `src/lib/tiempoRealUrl.ts`,
  `src/lib/tiempoReal/` (gestor de conexión y contratos), `src/hooks/useTiempoReal.js`
  y los hooks de mensajes, menú principal y «En curso».

## Autenticación y autorización

- **Ticket de un solo uso.** El backend no puede validar la cookie de Next.js. Next.js
  verifica la sesión y pide un ticket para el usuario de esa sesión, nunca para un id
  enviado por el navegador. La ruta del backend exige `X-Internal-Api-Key` y comprueba
  que la cuenta exista. El ticket es aleatorio (256 bits) y vale 60 s. Se consume al
  conectar y solo sirve para el Hub. El backend guarda su hash, no el valor. Next.js
  expone la ruta como `POST`, así que `proxy.ts` rechaza las solicitudes de otro
  origen (CSRF).
- **Conexión.** `TicketTiempoRealHandler` consume el ticket de `access_token` y crea
  la identidad (`NameIdentifier` = id de usuario). Fuera de `/hubs/tiempo-real` no hace
  nada. La autenticación vence a la hora (`CloseOnAuthenticationExpiration`): entonces
  el servidor cierra la conexión y el cliente pide otro ticket, con lo que Next.js
  vuelve a verificar la sesión.
- **Sin grupos ni métodos.** El Hub no expone métodos, así que el navegador no puede
  unirse a un grupo ni pedir eventos de otro usuario cambiando un id. El servidor saca
  los destinatarios de los datos guardados: emisor y receptor del mensaje, lector y
  emisor de la lectura, y conductor más pasajeros activos del viaje. Después envía con
  `Clients.Users(...)`.
- **Origen y transporte.** Solo WebSocket y sin negociación: es una única solicitud,
  sin CORS y sin transportes de respaldo. `OrigenTiempoRealMiddleware` rechaza con 403
  el WebSocket de una página cuyo `Origin` no esté en `TiempoReal:OrigenesPermitidos`.
  CORS del backend sigue cerrado.
- **Límites.** 30 tickets por usuario y minuto, 10 conexiones abiertas por usuario (una
  por pestaña), 50 000 tickets pendientes en total y mensajes entrantes de 4 KB como
  máximo.
- **Independiente de otros comprobantes.** El Hub no usa la cookie `sesion` ni las
  cookies temporales del registro (`correo_verificado`, `google_registro`). Hoy no
  existen códigos de verificación de correo ni de recuperación de contraseña; esos
  flujos se eliminaron.

## Contratos (versión 1)

Cada evento lleva `version`. Un cambio incompatible sube la versión. El cliente no
interpreta un evento de una versión que no conoce: vuelve a consultar por HTTP.

| Evento | Campos | Lo reciben | Se publica |
| --- | --- | --- | --- |
| `MensajeNuevo` | `version, idMensaje, idEmisor, idReceptor, nombreEmisor, contenido, fechaHora` | Emisor y receptor | Tras guardar `POST /api/Mensajes` |
| `MensajesLeidos` | `version, idLector, idEmisor, hastaIdMensaje` | Lector y emisor | Tras marcar leídos en `GET /api/Mensajes/conversacion` |
| `ViajeActualizado` | `version, motivo, idViaje` | Conductor y pasajeros afectados | Tras guardar el cambio, ver motivos |

Motivos de `ViajeActualizado`:

- `reserva-creada`: `POST /api/Viajes/{id}/reservar`.
- `solicitud-aceptada`: `POST /api/solicitudes/{id}/aceptar`.
- `reserva-cancelada`: el pasajero sale del viaje.
- `reserva-finalizada`: el pasajero finaliza. No libera cupos ni cambia el viaje.
- `viaje-cancelado`: el conductor cancela.
- `viaje-modificado`: `PUT /api/Viajes/{id}`. Solo lo reciben el conductor y los
  pasajeros activos.
- `viaje-eliminado`: `DELETE /api/Viajes/{id}`. Los pasajeros se calculan antes del
  borrado en cascada.

`ViajeActualizado` no lleva los datos del viaje: el cliente los pide a
`/api/viajes/en-curso`, donde se aplica la autorización de siempre. Ningún evento
lleva contraseñas, tokens, correos ni teléfonos.

## Desconexión y reconexión

- **Una conexión por pestaña.** `src/lib/tiempoReal/gestor.js` la comparte entre
  componentes con conteo de referencias. Se abre con el primero y se cierra 1 s después
  de que el último la suelta. Un inicio en curso no se duplica.
- **Espera progresiva.** Los reintentos esperan 0, 2, 5, 10, 20 y luego 30 s, con
  variación de ±20 %, tanto al iniciar como al reconectar. Cada intento pide un ticket
  nuevo. Al volver la red (`online`) o la pestaña (`visibilitychange`) se reintenta
  enseguida.
- **Parada definitiva.** Sin sesión (401) o con la función desactivada (503
  `desactivado`) no se reintenta en esa página.
- **Resincronización.** Después de cada (re)conexión cada vista vuelve a consultar por
  HTTP: la conversación, la lista de chats, los avisos de mensajes (avisa de lo que
  llegó durante el corte) y el viaje en curso. No hay reenvío de eventos perdidos:
  HTTP es la recuperación.
- **Respaldo.** Mientras la conexión no está activa, cada vista recupera su consulta
  periódica anterior.
- **Operaciones.** Ninguna depende del Hub. El evento se publica después de
  `SaveChanges`/`Commit` y sin esperar al envío. Si publicar falla, se registra en el
  log y la respuesta HTTP es la misma.

## Configuración y despliegue

Backend (Render):

| Variable | Uso |
| --- | --- |
| `TiempoReal__OrigenesPermitidos` | Orígenes de la app web que pueden abrir el WebSocket, separados por coma (por ejemplo, el dominio público del frontend). Vacío fuera de Development: ningún navegador conecta y la app usa solo HTTP (se avisa en el log al arrancar). En Development, si está vacío, se admiten `http://localhost:3000` y `http://127.0.0.1:3000`. |
| `INTERNAL_API_KEY` | La misma de siempre; protege también la emisión de tickets. |

Frontend (Vercel):

| Variable | Uso |
| --- | --- |
| `SIGNALR_HUB_URL` | Opcional. URL pública del Hub. Por defecto, `VITE_API_URL` + `/hubs/tiempo-real`. `off` desactiva el tiempo real. En producción solo se admite HTTPS. |
| `VITE_API_URL` | La misma de siempre; de ella se deriva la URL del Hub. |

- La CSP (`connect-src`) se calcula al compilar con esas variables. Si cambian, hay que
  volver a desplegar.
- El servicio del backend debe admitir WebSockets. Render los admite.
- El orden de despliegue no importa:
  - Si el frontend sale primero, el ticket responde 503 `desactivado` y la app sigue
    con HTTP.
  - Si el backend sale primero, nadie conecta hasta publicar el frontend.
- No hay cambios de esquema ni migraciones.

### Una sola instancia

Los tickets, el registro de conexiones y el reparto de SignalR viven en memoria, igual
que `LimitadorIntentos`. Con varias instancias del backend harían falta un almacén de
tickets compartido y un backplane (por ejemplo, Redis o Azure SignalR), porque un
evento publicado en una instancia no llegaría a las conexiones de otra. No se añadieron
porque el despliegue actual es de una instancia.

## Pruebas y medición

- Backend (`Backend/Tests/TiempoReal*.cs`):
  - Tickets: un solo uso, vencimiento, límite por usuario, valores inventados.
  - Hub sobre WebSocket real en servidor de pruebas: sin ticket, ticket usado u origen
    ajeno no conectan.
  - Aislamiento: un tercero no recibe los eventos ni puede invocar métodos o unirse a
    grupos.
  - Límite de conexiones, cierre al vencer la autenticación y mensajes enviados
    durante una desconexión (se recuperan por HTTP).
  - Publicación desde cada flujo HTTP solo después de guardar, y nada si la operación
    se rechaza.
  - Un Hub caído no afecta a la respuesta HTTP.
- Frontend:
  - `tests/tiempo-real-ticket.test.mjs`: ruta del ticket, URL y CSP.
  - `tests/tiempo-real-gestor.test.mjs`: conexión única, espera progresiva, ticket
    nuevo, resincronización y parada definitiva.
  - `tests/tiempo-real-vistas.test.mjs`: aplicación de eventos en las vistas.
- Medición (`MideLaLatenciaDeUnMensajeHastaElReceptor`): del `POST` del mensaje a la
  llegada del evento al receptor. Se mide en proceso, con servidor de pruebas y base en
  memoria. No incluye red ni PostgreSQL, así que es una cota inferior.

## Pendiente

- Probar en un navegador real contra el backend desplegado (no se hizo: requiere sesión
  y base reales).
- `ReservarViaje` publica `reserva-creada`, pero su prueba automática no es posible con
  la base en memoria (usa `SELECT … FOR UPDATE`).
- Las solicitudes pendientes para conductores y la búsqueda de viajes siguen con
  consulta periódica.
- El ticket viaja en la URL del WebSocket (los navegadores no permiten cabeceras). Puede
  aparecer en registros de acceso. Es de un solo uso y dura 60 s.
- Escalado horizontal: ver «Una sola instancia».
