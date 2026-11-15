---
tabla: moto
entidad: Backend.Models.Moto
tags:
  - tabla
  - cozymov
---

# Moto

Detalle específico de motocicleta; sus datos comunes viven en [[Vehiculo]].

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_vehiculo` | bigint | Clave primaria y FK a [[Vehiculo]] |
| `modalidad` | varchar(20) | Modalidad de la moto |

Cada detalle corresponde a un solo vehículo. Al eliminar el vehículo, este
registro se elimina en cascada.
