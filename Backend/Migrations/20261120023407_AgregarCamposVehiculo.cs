using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AgregarCamposVehiculo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vehiculo_Usuarios_IdUsuario",
                table: "vehiculo");

            migrationBuilder.DropCheckConstraint(
                name: "ck_automovil_numero_puertas",
                table: "automovil");

            migrationBuilder.RenameColumn(
                name: "Tipo",
                table: "vehiculo",
                newName: "tipo");

            migrationBuilder.RenameColumn(
                name: "Modelo",
                table: "vehiculo",
                newName: "modelo");

            migrationBuilder.RenameColumn(
                name: "Capacidad",
                table: "vehiculo",
                newName: "capacidad");

            migrationBuilder.RenameColumn(
                name: "IdUsuario",
                table: "vehiculo",
                newName: "id_usuario");

            migrationBuilder.RenameColumn(
                name: "Foto",
                table: "vehiculo",
                newName: "foto_vehiculo");

            migrationBuilder.RenameIndex(
                name: "IX_vehiculo_IdUsuario",
                table: "vehiculo",
                newName: "IX_vehiculo_id_usuario");

            migrationBuilder.AlterColumn<string>(
                name: "tipo",
                table: "vehiculo",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "modelo",
                table: "vehiculo",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "foto_vehiculo",
                table: "vehiculo",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_frontal",
                table: "vehiculo",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_lateral",
                table: "vehiculo",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_perfil",
                table: "vehiculo",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "marca",
                table: "vehiculo",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "doc_soat",
                table: "moto",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "doc_tecnomecanica",
                table: "moto",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_licencia",
                table: "moto",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_placa",
                table: "moto",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "capacidad_peso",
                table: "bicicleta_electrica",
                type: "numeric(6,2)",
                precision: 6,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "capacidad_vehicular",
                table: "bicicleta_electrica",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "casco",
                table: "bicicleta_electrica",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "chaleco",
                table: "bicicleta_electrica",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "luces",
                table: "bicicleta_electrica",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "numero_serie",
                table: "bicicleta_electrica",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "velocidad_maxima",
                table: "bicicleta_electrica",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "doc_soat",
                table: "automovil",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "doc_tecnomecanica",
                table: "automovil",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_licencia",
                table: "automovil",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "foto_placa",
                table: "automovil",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            // ---- Datos existentes: normalizar "tipo" y crear la fila de subtipo ----
            // 1) El subtipo que ya tiene el vehiculo manda sobre el texto de "tipo".
            // 2) Sin fila de subtipo, se normaliza el texto (mayusculas, acentos, espacios).
            migrationBuilder.Sql("""
                UPDATE vehiculo v
                SET tipo = CASE
                    WHEN EXISTS (SELECT 1 FROM automovil a WHERE a.id_vehiculo = v.id_vehiculo) THEN 'automovil'
                    WHEN EXISTS (SELECT 1 FROM moto m WHERE m.id_vehiculo = v.id_vehiculo) THEN 'moto'
                    WHEN EXISTS (SELECT 1 FROM bicicleta_electrica b WHERE b.id_vehiculo = v.id_vehiculo) THEN 'bicicleta_electrica'
                    ELSE lower(regexp_replace(
                        translate(btrim(v.tipo), 'áéíóúÁÉÍÓÚüÜ', 'aeiouAEIOUuU'),
                        '[\s_-]+', '_', 'g'))
                END;
                """);

            // Un tipo que no se reconoce ni tiene subtipo no se puede corregir solo:
            // se aborta con un mensaje claro (la migracion es transaccional) antes del CHECK.
            migrationBuilder.Sql("""
                DO $$
                DECLARE ids text;
                BEGIN
                    SELECT string_agg(id_vehiculo::text || '=' || quote_literal(tipo), ', ')
                    INTO ids
                    FROM vehiculo
                    WHERE tipo NOT IN ('automovil', 'moto', 'bicicleta_electrica');
                    IF ids IS NOT NULL THEN
                        RAISE EXCEPTION 'Hay vehiculos con un tipo no reconocido: %. Corrija vehiculo.tipo y repita la migracion.', ids;
                    END IF;
                END $$;
                """);

            // Fila de subtipo para cada vehiculo que no la tenga, con los archivos en null.
            // numero_puertas y modalidad son NOT NULL: se usan valores provisionales.
            migrationBuilder.Sql("""
                INSERT INTO automovil (id_vehiculo, numero_puertas)
                SELECT v.id_vehiculo, 4 FROM vehiculo v
                WHERE v.tipo = 'automovil'
                  AND NOT EXISTS (SELECT 1 FROM automovil a WHERE a.id_vehiculo = v.id_vehiculo);

                INSERT INTO moto (id_vehiculo, modalidad)
                SELECT v.id_vehiculo, 'sin_especificar' FROM vehiculo v
                WHERE v.tipo = 'moto'
                  AND NOT EXISTS (SELECT 1 FROM moto m WHERE m.id_vehiculo = v.id_vehiculo);

                INSERT INTO bicicleta_electrica (id_vehiculo, capacidad_vehicular, casco, chaleco, luces)
                SELECT v.id_vehiculo, false, false, false, false FROM vehiculo v
                WHERE v.tipo = 'bicicleta_electrica'
                  AND NOT EXISTS (SELECT 1 FROM bicicleta_electrica b WHERE b.id_vehiculo = v.id_vehiculo);
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_vehiculo_tipo",
                table: "vehiculo",
                sql: "tipo IN ('automovil', 'moto', 'bicicleta_electrica')");

            migrationBuilder.CreateIndex(
                name: "IX_bicicleta_electrica_numero_serie",
                table: "bicicleta_electrica",
                column: "numero_serie",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_bicicleta_electrica_capacidad_peso",
                table: "bicicleta_electrica",
                sql: "capacidad_peso > 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_bicicleta_electrica_velocidad_maxima",
                table: "bicicleta_electrica",
                sql: "velocidad_maxima > 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_automovil_numero_puertas",
                table: "automovil",
                sql: "numero_puertas IN (2, 3, 4, 5)");

            migrationBuilder.AddForeignKey(
                name: "FK_vehiculo_Usuarios_id_usuario",
                table: "vehiculo",
                column: "id_usuario",
                principalTable: "Usuarios",
                principalColumn: "IdPersonas",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Nota: el valor normalizado de vehiculo.tipo y las filas de subtipo creadas
            // en Up no se deshacen (no se conserva el texto original); no afectan al esquema anterior.
            migrationBuilder.DropForeignKey(
                name: "FK_vehiculo_Usuarios_id_usuario",
                table: "vehiculo");

            migrationBuilder.DropCheckConstraint(
                name: "ck_vehiculo_tipo",
                table: "vehiculo");

            migrationBuilder.DropIndex(
                name: "IX_bicicleta_electrica_numero_serie",
                table: "bicicleta_electrica");

            migrationBuilder.DropCheckConstraint(
                name: "ck_bicicleta_electrica_capacidad_peso",
                table: "bicicleta_electrica");

            migrationBuilder.DropCheckConstraint(
                name: "ck_bicicleta_electrica_velocidad_maxima",
                table: "bicicleta_electrica");

            migrationBuilder.DropCheckConstraint(
                name: "ck_automovil_numero_puertas",
                table: "automovil");

            migrationBuilder.DropColumn(
                name: "foto_frontal",
                table: "vehiculo");

            migrationBuilder.DropColumn(
                name: "foto_lateral",
                table: "vehiculo");

            migrationBuilder.DropColumn(
                name: "foto_perfil",
                table: "vehiculo");

            migrationBuilder.DropColumn(
                name: "marca",
                table: "vehiculo");

            migrationBuilder.DropColumn(
                name: "doc_soat",
                table: "moto");

            migrationBuilder.DropColumn(
                name: "doc_tecnomecanica",
                table: "moto");

            migrationBuilder.DropColumn(
                name: "foto_licencia",
                table: "moto");

            migrationBuilder.DropColumn(
                name: "foto_placa",
                table: "moto");

            migrationBuilder.DropColumn(
                name: "capacidad_peso",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "capacidad_vehicular",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "casco",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "chaleco",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "luces",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "numero_serie",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "velocidad_maxima",
                table: "bicicleta_electrica");

            migrationBuilder.DropColumn(
                name: "doc_soat",
                table: "automovil");

            migrationBuilder.DropColumn(
                name: "doc_tecnomecanica",
                table: "automovil");

            migrationBuilder.DropColumn(
                name: "foto_licencia",
                table: "automovil");

            migrationBuilder.DropColumn(
                name: "foto_placa",
                table: "automovil");

            migrationBuilder.RenameColumn(
                name: "tipo",
                table: "vehiculo",
                newName: "Tipo");

            migrationBuilder.RenameColumn(
                name: "modelo",
                table: "vehiculo",
                newName: "Modelo");

            migrationBuilder.RenameColumn(
                name: "capacidad",
                table: "vehiculo",
                newName: "Capacidad");

            migrationBuilder.RenameColumn(
                name: "id_usuario",
                table: "vehiculo",
                newName: "IdUsuario");

            migrationBuilder.RenameColumn(
                name: "foto_vehiculo",
                table: "vehiculo",
                newName: "Foto");

            migrationBuilder.RenameIndex(
                name: "IX_vehiculo_id_usuario",
                table: "vehiculo",
                newName: "IX_vehiculo_IdUsuario");

            migrationBuilder.AlterColumn<string>(
                name: "Tipo",
                table: "vehiculo",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "Modelo",
                table: "vehiculo",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AlterColumn<string>(
                name: "Foto",
                table: "vehiculo",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_automovil_numero_puertas",
                table: "automovil",
                sql: "numero_puertas IN (2, 3, 4, 5)");

            migrationBuilder.AddForeignKey(
                name: "FK_vehiculo_Usuarios_IdUsuario",
                table: "vehiculo",
                column: "IdUsuario",
                principalTable: "Usuarios",
                principalColumn: "IdPersonas",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
