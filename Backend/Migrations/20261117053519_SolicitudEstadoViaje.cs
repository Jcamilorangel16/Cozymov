using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class SolicitudEstadoViaje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "estado",
                table: "solicitud",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "pendiente");

            migrationBuilder.AddColumn<long>(
                name: "id_viaje",
                table: "solicitud",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_estado",
                table: "solicitud",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_id_viaje",
                table: "solicitud",
                column: "id_viaje");

            migrationBuilder.AddForeignKey(
                name: "FK_solicitud_viaje_id_viaje",
                table: "solicitud",
                column: "id_viaje",
                principalTable: "viaje",
                principalColumn: "id_viaje",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_solicitud_viaje_id_viaje",
                table: "solicitud");

            migrationBuilder.DropIndex(
                name: "IX_solicitud_estado",
                table: "solicitud");

            migrationBuilder.DropIndex(
                name: "IX_solicitud_id_viaje",
                table: "solicitud");

            migrationBuilder.DropColumn(
                name: "estado",
                table: "solicitud");

            migrationBuilder.DropColumn(
                name: "id_viaje",
                table: "solicitud");
        }
    }
}
