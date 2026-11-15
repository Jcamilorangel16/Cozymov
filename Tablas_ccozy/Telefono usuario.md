---
tabla: telefono_usuario
entidad: Backend.Models.TelefonoUsuario
tags:
  - tabla
  - cozymov
---

# TelefonoUsuario

Teléfonos de contacto de un usuario (atributo multivaluado, 1FN).

| Columna | Tipo | Uso |
|---|---|---|
| `id_telefono` | bigint | PK |
| `id_usuario` | integer | FK a [[Usuarios]] (cascade) |
| `telefono` | varchar(20) | Número; único por usuario |

Un usuario puede tener varios teléfonos. Al eliminar [[Usuarios|el usuario]],
sus teléfonos se eliminan en cascada. El índice único sobre
`(id_usuario, telefono)` evita repetir el mismo número para el mismo usuario.
