---
tabla: solicitud
entidad: Backend.Models.Solicitud
tags:
  - tabla
  - cozymov
---

# Solicitud

Necesidad de viaje de un pasajero; no equivale a una reserva.

| Columna | Tipo | Uso |
|---|---|---|
| `id_solicitud` | bigint | PK |
| `id_usuario` | integer | FK a [[Usuarios]] (restrict) |
| `id_ruta` | bigint | FK a [[Ruta]] (restrict) |
| `fecha_hora` | timestamp | Fecha de referencia |
| `hora_limite` | time, nullable | Hora máxima de llegada |
| `presupuesto` | numeric(10,2), nullable | Máximo a pagar |
| `compartir` | boolean | Desea compartir |

## Relaciones

- Cada solicitud referencia obligatoriamente a [[Usuarios|un usuario]] y una
  [[Ruta]].
- El borrado de usuario o ruta se restringe mientras existan solicitudes
  relacionadas.
