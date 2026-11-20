-- Reparacion idempotente para una base donde AgregarCamposVehiculo quedo a medias o
-- se aplico a mano. NO se ejecuta sola: revisarla y correrla manualmente (SQL editor
-- de Supabase) solo si las consultas de diagnostico muestran un estado parcial.
-- Si la migracion se revirtio por completo (no existen foto_frontal ni marca en
-- vehiculo y __EFMigrationsHistory no la lista), NO uses este script: aplica
-- `dotnet ef database update` y la migracion hace todo.
-- Deja la base igual que la migracion y la registra en el historial.

BEGIN;

-- 1) Renombres de columnas y del indice (solo si todavia tienen el nombre anterior).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
      ('Tipo','tipo'), ('Modelo','modelo'), ('Capacidad','capacidad'),
      ('IdUsuario','id_usuario'), ('Foto','foto_vehiculo')) AS x(viejo, nuevo)
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'vehiculo' AND column_name = r.viejo)
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'vehiculo' AND column_name = r.nuevo) THEN
      EXECUTE format('ALTER TABLE vehiculo RENAME COLUMN %I TO %I', r.viejo, r.nuevo);
    END IF;
  END LOOP;
  IF to_regclass('"IX_vehiculo_IdUsuario"') IS NOT NULL AND to_regclass('"IX_vehiculo_id_usuario"') IS NULL THEN
    ALTER INDEX "IX_vehiculo_IdUsuario" RENAME TO "IX_vehiculo_id_usuario";
  END IF;
END $$;

-- 2) Tipos de columna.
ALTER TABLE vehiculo ALTER COLUMN tipo TYPE varchar(30);
ALTER TABLE vehiculo ALTER COLUMN modelo TYPE varchar(50);
ALTER TABLE vehiculo ALTER COLUMN foto_vehiculo TYPE varchar(500);

-- 3) Columnas nuevas (admiten null, salvo los booleanos de la bicicleta).
ALTER TABLE vehiculo ADD COLUMN IF NOT EXISTS marca varchar(100);
ALTER TABLE vehiculo ADD COLUMN IF NOT EXISTS foto_frontal varchar(500);
ALTER TABLE vehiculo ADD COLUMN IF NOT EXISTS foto_lateral varchar(500);
ALTER TABLE vehiculo ADD COLUMN IF NOT EXISTS foto_perfil varchar(500);

ALTER TABLE automovil ADD COLUMN IF NOT EXISTS foto_placa varchar(500);
ALTER TABLE automovil ADD COLUMN IF NOT EXISTS foto_licencia varchar(500);
ALTER TABLE automovil ADD COLUMN IF NOT EXISTS doc_tecnomecanica varchar(500);
ALTER TABLE automovil ADD COLUMN IF NOT EXISTS doc_soat varchar(500);

ALTER TABLE moto ADD COLUMN IF NOT EXISTS foto_placa varchar(500);
ALTER TABLE moto ADD COLUMN IF NOT EXISTS foto_licencia varchar(500);
ALTER TABLE moto ADD COLUMN IF NOT EXISTS doc_tecnomecanica varchar(500);
ALTER TABLE moto ADD COLUMN IF NOT EXISTS doc_soat varchar(500);

ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS numero_serie varchar(100);
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS velocidad_maxima numeric(5,2);
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS capacidad_peso numeric(6,2);
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS capacidad_vehicular boolean NOT NULL DEFAULT false;
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS casco boolean NOT NULL DEFAULT false;
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS chaleco boolean NOT NULL DEFAULT false;
ALTER TABLE bicicleta_electrica ADD COLUMN IF NOT EXISTS luces boolean NOT NULL DEFAULT false;

-- Si un intento previo dejo valores provisionales invalidos, se llevan a null.
ALTER TABLE bicicleta_electrica ALTER COLUMN numero_serie DROP NOT NULL;
ALTER TABLE bicicleta_electrica ALTER COLUMN velocidad_maxima DROP NOT NULL;
ALTER TABLE bicicleta_electrica ALTER COLUMN capacidad_peso DROP NOT NULL;
UPDATE bicicleta_electrica SET numero_serie = NULL WHERE numero_serie = '';
UPDATE bicicleta_electrica SET velocidad_maxima = NULL WHERE velocidad_maxima <= 0;
UPDATE bicicleta_electrica SET capacidad_peso = NULL WHERE capacidad_peso <= 0;

-- 4) Datos: normalizar "tipo" y crear filas de subtipo (igual que la migracion).
UPDATE vehiculo v
SET tipo = CASE
    WHEN EXISTS (SELECT 1 FROM automovil a WHERE a.id_vehiculo = v.id_vehiculo) THEN 'automovil'
    WHEN EXISTS (SELECT 1 FROM moto m WHERE m.id_vehiculo = v.id_vehiculo) THEN 'moto'
    WHEN EXISTS (SELECT 1 FROM bicicleta_electrica b WHERE b.id_vehiculo = v.id_vehiculo) THEN 'bicicleta_electrica'
    ELSE lower(regexp_replace(translate(btrim(v.tipo), 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU'), '[\s_-]+', '_', 'g'))
END;

DO $$
DECLARE ids text;
BEGIN
  SELECT string_agg(id_vehiculo::text || '=' || quote_literal(tipo), ', ') INTO ids
  FROM vehiculo WHERE tipo NOT IN ('automovil', 'moto', 'bicicleta_electrica');
  IF ids IS NOT NULL THEN
    RAISE EXCEPTION 'Hay vehiculos con un tipo no reconocido: %. Corrija vehiculo.tipo y repita.', ids;
  END IF;
END $$;

INSERT INTO automovil (id_vehiculo, numero_puertas)
SELECT v.id_vehiculo, 4 FROM vehiculo v
WHERE v.tipo = 'automovil' AND NOT EXISTS (SELECT 1 FROM automovil a WHERE a.id_vehiculo = v.id_vehiculo);
INSERT INTO moto (id_vehiculo, modalidad)
SELECT v.id_vehiculo, 'sin_especificar' FROM vehiculo v
WHERE v.tipo = 'moto' AND NOT EXISTS (SELECT 1 FROM moto m WHERE m.id_vehiculo = v.id_vehiculo);
INSERT INTO bicicleta_electrica (id_vehiculo, capacidad_vehicular, casco, chaleco, luces)
SELECT v.id_vehiculo, false, false, false, false FROM vehiculo v
WHERE v.tipo = 'bicicleta_electrica' AND NOT EXISTS (SELECT 1 FROM bicicleta_electrica b WHERE b.id_vehiculo = v.id_vehiculo);

-- 5) Restricciones e indices (se recrean con la definicion actual).
ALTER TABLE vehiculo DROP CONSTRAINT IF EXISTS ck_vehiculo_tipo;
ALTER TABLE vehiculo ADD CONSTRAINT ck_vehiculo_tipo CHECK (tipo IN ('automovil', 'moto', 'bicicleta_electrica'));

ALTER TABLE bicicleta_electrica DROP CONSTRAINT IF EXISTS ck_bicicleta_electrica_velocidad_maxima;
ALTER TABLE bicicleta_electrica ADD CONSTRAINT ck_bicicleta_electrica_velocidad_maxima CHECK (velocidad_maxima > 0);
ALTER TABLE bicicleta_electrica DROP CONSTRAINT IF EXISTS ck_bicicleta_electrica_capacidad_peso;
ALTER TABLE bicicleta_electrica ADD CONSTRAINT ck_bicicleta_electrica_capacidad_peso CHECK (capacidad_peso > 0);
ALTER TABLE automovil DROP CONSTRAINT IF EXISTS ck_automovil_numero_puertas;
ALTER TABLE automovil ADD CONSTRAINT ck_automovil_numero_puertas CHECK (numero_puertas IN (2, 3, 4, 5));

CREATE UNIQUE INDEX IF NOT EXISTS "IX_bicicleta_electrica_numero_serie" ON bicicleta_electrica (numero_serie);

-- 6) Clave foranea con el nombre nuevo.
ALTER TABLE vehiculo DROP CONSTRAINT IF EXISTS "FK_vehiculo_Usuarios_IdUsuario";
ALTER TABLE vehiculo DROP CONSTRAINT IF EXISTS "FK_vehiculo_Usuarios_id_usuario";
ALTER TABLE vehiculo ADD CONSTRAINT "FK_vehiculo_Usuarios_id_usuario"
  FOREIGN KEY (id_usuario) REFERENCES "Usuarios" ("IdPersonas") ON DELETE RESTRICT;

-- 7) Registrar la migracion para que `database update` no la repita.
INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
SELECT '20261120023407_AgregarCamposVehiculo',
       (SELECT "ProductVersion" FROM "__EFMigrationsHistory" ORDER BY "MigrationId" DESC LIMIT 1)
ON CONFLICT ("MigrationId") DO NOTHING;

COMMIT;
