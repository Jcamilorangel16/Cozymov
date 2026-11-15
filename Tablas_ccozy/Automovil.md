---
tabla: automovil
entidad: Backend.Models.Automovil
tags:
  - tabla
  - cozymov
---

# Automovil

Detalle específico de automóvil; sus datos comunes viven en [[Vehiculo]].

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_vehiculo` | bigint | Clave primaria y FK a [[Vehiculo]] |
| `numero_puertas` | smallint | Número de puertas: 2, 3, 4 o 5 |

Cada detalle corresponde a un solo vehículo. Al eliminar el vehículo, este
registro se elimina en cascada.
