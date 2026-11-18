using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class QuitarConductorVehiculoViaje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_viaje_vehiculo_id_vehiculo",
                table: "viaje");

            // Según la base, el índice se creó como IX_viaje_IdVehiculo (migración ViajeVehiculo)
            // o como IX_viaje_id_vehiculo (modelo): se elimina el que exista.
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_viaje_IdVehiculo";""");
            migrationBuilder.Sql("""DROP INDEX IF EXISTS "IX_viaje_id_vehiculo";""");

            migrationBuilder.DropColumn(
                name: "id_conductor",
                table: "viaje");

            migrationBuilder.DropColumn(
                name: "id_vehiculo",
                table: "viaje");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "id_conductor",
                table: "viaje",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<long>(
                name: "id_vehiculo",
                table: "viaje",
                type: "bigint",
                nullable: true);

            // Repuebla lo que se puede derivar: el conductor era el propio IdUsuario y, del
            // vehículo, solo se conoce el primero del conductor (no el que se eligió entonces).
            migrationBuilder.Sql("""UPDATE viaje SET id_conductor = "IdUsuario"::text;""");
            migrationBuilder.Sql("""
                UPDATE viaje v
                SET id_vehiculo = (
                    SELECT MIN(h.id_vehiculo) FROM vehiculo h WHERE h."IdUsuario" = v."IdUsuario");
                """);

            migrationBuilder.CreateIndex(
                name: "IX_viaje_id_vehiculo",
                table: "viaje",
                column: "id_vehiculo");

            migrationBuilder.AddForeignKey(
                name: "FK_viaje_vehiculo_id_vehiculo",
                table: "viaje",
                column: "id_vehiculo",
                principalTable: "vehiculo",
                principalColumn: "id_vehiculo",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
