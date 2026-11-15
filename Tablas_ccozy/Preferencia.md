---
tabla: preferencia
entidad: Backend.Models.Preferencia
tags:
  - tabla
  - cozymov
---

# Preferencia

Preferencias opcionales de búsqueda (relación 1:0..1 con [[Usuarios]]).

| Columna | Tipo | Uso |
|---|---|---|
| `id_usuario` | integer | PK y FK a [[Usuarios]] (cascade) |
| `prioridad_costo`, `prioridad_tiempo` | smallint, nullable | Importancia |
| `preferir_compartir` | boolean, nullable | Preferencia de compartir |

La clave compartida define una relación uno a uno opcional: un usuario puede
tener cero o una fila de preferencias. Al eliminar [[Usuarios|el usuario]], la
preferencia se elimina en cascada.
