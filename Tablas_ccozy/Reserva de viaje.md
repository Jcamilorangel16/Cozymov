---
tabla: reserva_viaje
entidad: Backend.Models.ReservaViaje
tags:
  - tabla
  - cozymov
---

# Reserva de viaje

Registra a un pasajero en un viaje.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_reserva` | bigint | Clave primaria autogenerada |
| `id_viaje` | bigint | FK obligatoria a [[Viaje]] |
| `id_pasajero` | integer | FK obligatoria a [[Usuarios]] |
| `fecha_reserva` | timestamp without time zone | Fecha de reserva |
| `estado` | varchar(20) | Estado; valor inicial `activa` |

## Relaciones y restricciones

- Cada reserva pertenece a un [[Viaje]]; al borrar el viaje, la reserva se
  elimina en cascada.
- Cada reserva corresponde a un [[Usuarios|usuario pasajero]]; el borrado de
  ese usuario es restrictivo.
- Puede tener cero o más [[Calificacion|calificaciones]]. Al borrar la reserva,
  sus calificaciones se eliminan en cascada.
- Índices únicos parciales impiden que un pasajero tenga más de una reserva
  activa y que repita una reserva activa para el mismo viaje.
