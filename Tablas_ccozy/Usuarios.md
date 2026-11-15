---
tabla: Usuarios
entidad: Backend.Models.Usuarios
tags:
  - tabla
  - cozymov
---

# Usuarios

Tabla de personas con cuenta en Cozymov.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `IdPersonas` | integer | Clave primaria |
| `Cedula` | text | Identificación |
| `PrimerNombre`, `SegundoNombre` | text | Nombres |
| `PrimerApellido`, `SegundoApellido` | text | Apellidos |
| `Edad` | integer | Edad |
| `Correo` | text | Correo electrónico |
| `Contrasena` | text | Credencial almacenada por la aplicación |
| `rol`, `ocupacion` | text | Rol y ocupación |
| `fechaderegistro` | timestamp with time zone | Fecha de registro |
| `EmailVerificado` | boolean | Confirmación del correo; valor predeterminado `true` |

## Relaciones

- Posee cero o más [[Vehiculo|vehículos]] por `vehiculo.IdUsuario`.
- Publica cero o más [[Viaje|viajes]] por `viaje.IdUsuario`.
- Puede ser pasajero de cero o más [[Reserva de viaje|reservas]] por
  `reserva_viaje.id_pasajero`.
- Participa en [[Mensajes]] mediante `IdEmisor` y `IdReceptor`.
- Puede tener una [[Preferencia]] opcional, con relación uno a uno por la clave
  compartida `id_usuario`.
- Puede registrar varios [[Telefono usuario|teléfonos]] y crear varias
  [[Solicitud|solicitudes]] de ruta.
- Puede aparecer en [[Calificacion|calificaciones]] como evaluador o evaluado;
  son dos relaciones distintas.

Los viajes y vehículos restringen la eliminación del usuario. Los mensajes y
las reservas también usan borrado restrictivo para las relaciones con usuarios.
Las solicitudes y calificaciones restringen el borrado; las preferencias y los
teléfonos se eliminan en cascada.
