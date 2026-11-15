---
tabla: Mensajes
entidad: Backend.Models.Mensaje
tags:
  - tabla
  - cozymov
---

# Mensajes

Mensajes directos enviados entre usuarios.

| Columna | Tipo aproximado | Uso |
|---|---|---|
| `IdMensaje` | integer | Clave primaria autogenerada |
| `IdEmisor` | integer | FK a [[Usuarios]] como emisor |
| `IdReceptor` | integer | FK a [[Usuarios]] como receptor |
| `Contenido` | varchar(500) | Texto del mensaje |
| `FechaHora` | timestamp with time zone | Fecha y hora |
| `Leido` | boolean | Indica si se leyó; valor predeterminado `false` |

## Relaciones

Cada mensaje tiene exactamente un emisor y un receptor, ambos usuarios. Un
usuario puede aparecer en muchos mensajes en cualquiera de los dos roles. Las
dos relaciones usan borrado restrictivo.
