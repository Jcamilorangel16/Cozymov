---
tabla: ruta
entidad: Backend.Models.Ruta
tags:
  - tabla
  - cozymov
---

# Ruta

Ruta reutilizable con ubicaciones y coordenadas de origen y destino.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `id_ruta` | bigint | Clave primaria autogenerada |
| `origen`, `destino` | varchar(200) | Ubicaciones |
| `lat_origen`, `lon_origen` | numeric(9,6) | Coordenadas de origen |
| `lat_destino`, `lon_destino` | numeric(9,6) | Coordenadas de destino |

## Relaciones

Una [[Ruta]] puede estar asociada a varios [[Viaje|viajes]]. Cada viaje puede
tener una ruta o dejar `id_ruta` vacío. La eliminación de una ruta con viajes
asociados está restringida.

Una ruta también puede aparecer en varias [[Solicitud|solicitudes]]. Esa FK es
obligatoria y también restringe la eliminación de una ruta referenciada.
