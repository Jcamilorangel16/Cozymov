---
tabla: bicicleta_electrica
entidad: Backend.Models.Bicicleta
tags:
  - tabla
  - cozymov
---

# Bicicleta electrica

Identifica un vehículo eléctrico como bicicleta.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_vehiculo` | bigint | Clave primaria y FK a [[Vehiculo]] |

Cada detalle corresponde a un solo vehículo. Al eliminar el vehículo, este
registro se elimina en cascada.
