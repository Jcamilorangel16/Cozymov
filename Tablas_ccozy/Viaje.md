---
tabla: viaje
entidad: Backend.Models.Viaje
tags:
  - tabla
  - cozymov
---

# Viaje

Viaje publicado por un usuario.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_viaje` | bigint | Clave primaria |
| `IdUsuario` | integer | FK a [[Usuarios]] |
| `id_conductor` | varchar(20) | Identificador de conductor; no es FK |
| `id_ruta` | bigint, nullable | FK opcional a [[Ruta]] |
| `id_vehiculo` | bigint, nullable | FK opcional a [[Vehiculo]] |
| `origen`, `destino` | varchar(200), nullable | Ubicaciones del viaje |
| `punto_encuentro` | varchar(200), nullable | Punto de encuentro |
| `informacion_adicional` | varchar(500), nullable | Información adicional |
| `fecha_hora_salida` | timestamp without time zone | Salida |
| `costo` | numeric(10,2) | Costo |
| `cupos_disponibles` | integer | Cupos restantes |
| `estado` | varchar(20) | Estado del viaje |

## Relaciones

- Pertenece a [[Usuarios]] mediante `IdUsuario` (obligatoria; borrado restrictivo).
- Puede apuntar a una [[Ruta]] mediante `id_ruta` (opcional; borrado restrictivo).
- Puede utilizar un [[Vehiculo]] mediante `id_vehiculo` (opcional). Al borrar el
  vehículo, `id_vehiculo` pasa a `NULL` y el viaje se conserva.
- Tiene cero o más [[Reserva de viaje|reservas]]. Al borrar el viaje, sus
  reservas se eliminan en cascada.

`origen` y `destino` son texto en el viaje; no son claves foráneas.
