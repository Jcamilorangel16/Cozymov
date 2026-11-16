using Backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261115000000_ViajeVehiculo")]
public partial class ViajeVehiculo : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE viaje AS viaje
            SET id_vehiculo = NULL
            WHERE id_vehiculo IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM vehiculo
                  WHERE vehiculo.id_vehiculo = viaje.id_vehiculo);
            """);

        migrationBuilder.CreateIndex(
            name: "IX_viaje_IdVehiculo",
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

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_viaje_vehiculo_id_vehiculo",
            table: "viaje");

        migrationBuilder.DropIndex(
            name: "IX_viaje_IdVehiculo",
            table: "viaje");
    }
}
