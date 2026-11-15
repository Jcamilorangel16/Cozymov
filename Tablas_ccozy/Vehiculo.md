---
tabla: vehiculo
entidad: Backend.Models.Vehiculo
tags:
  - tabla
  - cozymov
---

# Vehiculo

Datos comunes de los vehículos registrados por los usuarios.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_vehiculo` | bigint | Clave primaria autogenerada |
| `Tipo`, `Modelo` | text | Tipo y modelo |
| `Capacidad` | integer | Capacidad |
| `Foto` | text, nullable | Foto |
| `IdUsuario` | integer | FK obligatoria a [[Usuarios]] |

## Relaciones

- Pertenece a un [[Usuarios|usuario propietario]]; la eliminación del usuario
  está restringida si tiene vehículos.
- Puede tener un detalle en [[Automovil]], [[Moto]] o
  [[Bicicleta electrica]]. Los detalles usan `id_vehiculo` como clave primaria
  y foránea; al borrar el vehículo se borran los detalles en cascada.
- Puede estar asociado a varios [[Viaje|viajes]]. Si se elimina el vehículo,
  los viajes permanecen y su `id_vehiculo` queda en `NULL`.

> [!warning] Especialización
> La relación garantiza como máximo un detalle de cada tipo por vehículo, pero
> no impone que los tres tipos sean mutuamente excluyentes.
