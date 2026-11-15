---
tabla: calificacion
entidad: Backend.Models.Calificacion
tags:
  - tabla
  - cozymov
---

# Calificacion

Valoración ligada a una reserva.

| Columna | Tipo | Uso |
|---|---|---|
| `id_calificacion` | bigint | PK |
| `id_reserva` | bigint | FK a [[Reserva de viaje]] (cascade) |
| `id_evaluador`, `id_evaluado` | integer | FK a [[Usuarios]] (restrict) |
| `puntuacion` | smallint | CHECK entre 1 y 5 |
| `comentario` | varchar(500), nullable | Opcional |

## Relaciones

- Cada calificación pertenece a una [[Reserva de viaje]]. Si se elimina la
  reserva, las calificaciones asociadas se eliminan en cascada.
- `id_evaluador` y `id_evaluado` apuntan a [[Usuarios]] en roles distintos; el
  borrado de cualquiera de esos usuarios está restringido.
- No existe un índice único para `id_reserva`, por lo que el esquema admite
  varias calificaciones para una misma reserva.
