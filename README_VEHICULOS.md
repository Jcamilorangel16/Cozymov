# API de vehículos

Este documento explica la implementación de vehículos en el proyecto `Backend`.

## Modelo implementado

`Vehiculo` es la entidad principal. Cada vehículo puede tener un único detalle especializado:

```text
Vehiculo
├── Automovil
├── Moto
└── Bicicleta eléctrica
```

`Automovil`, `Moto` y `Bicicleta` utilizan `IdVehiculo` como clave primaria y como clave foránea hacia `Vehiculo`. Esto corresponde a una relación uno a uno con clave primaria compartida.

`Automovil` se utiliza como equivalente de `Carro`; no existe una entidad separada llamada `Carro`.

Cada `Viaje` puede referenciar el vehículo utilizado mediante `id_vehiculo`. La clave foránea es opcional; si se elimina un vehículo, el viaje se conserva y su referencia queda en `NULL`.

## Entidades

### Vehiculo

Contiene la información común:

- `IdVehiculo`: identificador `BIGINT`.
- `Tipo`: tipo de vehículo.
- `Modelo`: modelo del vehículo.
- `Capacidad`: capacidad de pasajeros o carga.
- `Foto`: imagen opcional.
- `IdUsuario`: usuario propietario.

### Automovil

Contiene la información específica del automóvil:

- `IdVehiculo`: clave primaria y foránea.
- `NumeroPuertas`: cantidad de puertas permitida: `2`, `3`, `4` o `5`.

### Moto

Contiene la información específica de la moto:

- `IdVehiculo`: clave primaria y foránea.
- `Modalidad`: modalidad de la moto, con máximo 20 caracteres.

### Bicicleta eléctrica

Está representada por la clase `Bicicleta` y se almacena en la tabla `bicicleta_electrica`.

- `IdVehiculo`: clave primaria y foránea.

## Relaciones y borrado en cascada

Las relaciones se configuran en `Backend/Data/Configurations/`.

Cuando se elimina un registro de `Vehiculo`, Entity Framework Core elimina automáticamente el detalle relacionado de:

- `automovil`.
- `moto`.
- `bicicleta_electrica`.

Los detalles especializados usan `DeleteBehavior.Cascade`; los viajes que referencian al vehículo no se eliminan y su `id_vehiculo` queda en `NULL` (`DeleteBehavior.SetNull`).

## Tablas de PostgreSQL

La migración crea las siguientes tablas:

```text
vehiculo
automovil
moto
bicicleta_electrica
```

Las tablas especializadas tienen la siguiente estructura lógica:

```sql
CREATE TABLE automovil (
	id_vehiculo BIGINT PRIMARY KEY,
	numero_puertas SMALLINT NOT NULL
		CHECK (numero_puertas IN (2, 3, 4, 5)),
	FOREIGN KEY (id_vehiculo)
		REFERENCES vehiculo(id_vehiculo)
		ON DELETE CASCADE
);
```

Para `moto`:

```sql
CREATE TABLE moto (
	id_vehiculo BIGINT PRIMARY KEY,
	modalidad VARCHAR(20) NOT NULL,
	FOREIGN KEY (id_vehiculo)
		REFERENCES vehiculo(id_vehiculo)
		ON DELETE CASCADE
);
```

Para la bicicleta eléctrica:

```sql
CREATE TABLE bicicleta_electrica (
	id_vehiculo BIGINT PRIMARY KEY,
	FOREIGN KEY (id_vehiculo)
		REFERENCES vehiculo(id_vehiculo)
		ON DELETE CASCADE
);
```

## Endpoints

### Vehículos

```text
GET    /api/vehiculos
GET    /api/vehiculos/{idVehiculo}
POST   /api/vehiculos
PUT    /api/vehiculos/{idVehiculo}
DELETE /api/vehiculos/{idVehiculo}
```

Los endpoints `GET` incluyen el detalle relacionado mediante `Include`.

### Automóviles

```text
GET    /api/automoviles
GET    /api/automoviles/{idVehiculo}
POST   /api/automoviles/{idVehiculo}
PUT    /api/automoviles/{idVehiculo}
DELETE /api/automoviles/{idVehiculo}
```

### Motos

```text
GET    /api/motos
GET    /api/motos/{idVehiculo}
POST   /api/motos/{idVehiculo}
PUT    /api/motos/{idVehiculo}
DELETE /api/motos/{idVehiculo}
```

### Bicicletas eléctricas

```text
GET    /api/bicicletas-electricas
GET    /api/bicicletas-electricas/{idVehiculo}
POST   /api/bicicletas-electricas/{idVehiculo}
DELETE /api/bicicletas-electricas/{idVehiculo}
```

## Flujo de creación

Primero se crea el registro principal en `Vehiculo`.

```http
POST /api/vehiculos
Content-Type: application/json
```

```json
{
  "tipo": "Automovil",
  "modelo": "2024",
  "capacidad": 5,
  "foto": "vehiculo.jpg",
  "idUsuario": 1
}
```

La respuesta devuelve el `idVehiculo` generado. Después se crea el detalle específico.

```http
POST /api/automoviles/10
Content-Type: application/json
```

```json
{
  "numeroPuertas": 4
}
```

Para una moto:

```http
POST /api/motos/11
Content-Type: application/json
```

```json
{
  "modalidad": "Deportiva"
}
```

Para una bicicleta eléctrica:

```http
POST /api/bicicletas-electricas/12
```

No se necesita cuerpo JSON para crear el detalle de la bicicleta.

## DTOs

Los controladores utilizan DTOs para no recibir directamente las entidades completas:

- `VehiculoCreateDto`.
- `AutomovilDto`.
- `MotoDto`.
- `BicicletaDto`.

Los DTOs evitan exponer claves internas que no deben ser modificadas por el cliente.

## Migración

La migración generada es:

```text
Backend/Migrations/20261109224507_AddVehiculosRelacionados.cs
Backend/Migrations/20261109224507_AddVehiculosRelacionados.Designer.cs
Backend/Migrations/20261115000000_ViajeVehiculo.cs
```

`ViajeVehiculo` agrega la clave foránea opcional entre `viaje.id_vehiculo` y `vehiculo.id_vehiculo`, y limpia referencias huérfanas antiguas antes de crearla.

Para aplicarla, configura primero las credenciales correctas de PostgreSQL y ejecuta desde la raíz del repositorio:

```powershell
dotnet ef database update `
  --project .\Backend\Backend.csproj `
  --startup-project .\Backend\Backend.csproj
```

También se agregó:

```text
Backend/Data/AppDbContextFactory.cs
```

Esta fábrica permite generar migraciones en tiempo de diseño sin iniciar la aplicación.

## Estado de validación

El proyecto compila correctamente en .NET 10.

La migración se generó correctamente. Su aplicación no pudo completarse en el entorno local porque las credenciales configuradas para el usuario `postgres` no fueron aceptadas por PostgreSQL. Es necesario corregir la contraseña o la cadena de conexión antes de ejecutar `database update`.

## Archivos principales modificados

```text
Backend/Models/Vehiculo.cs
Backend/Models/Automovil.cs
Backend/Models/Moto.cs
Backend/Models/Bicicleta.cs
Backend/Data/AppDbContext.cs
Backend/Data/AppDbContextFactory.cs
Backend/Controllers/VehiculoesController.cs
Backend/Controllers/AutomovilsController.cs
Backend/Controllers/MotoesController.cs
Backend/Controllers/BicicletasController.cs
Backend/DTOs/VehiculosDTO.cs
Backend/DTOs/AutomovilDTO.cs
Backend/DTOs/MotoDTO.cs
Backend/DTOs/BicicletaDTO.cs
Backend/Migrations/20261109224507_AddVehiculosRelacionados.cs
```
