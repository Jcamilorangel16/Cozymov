using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class conectadoviaje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "IdUsuario",
                table: "viaje",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "viaje" AS v
                SET "IdUsuario" = u."IdPersonas"
                FROM "Usuarios" AS u
                WHERE NULLIF(TRIM(v."id_conductor"), '') = NULLIF(TRIM(u."Cedula"), '');
                """);

            migrationBuilder.CreateIndex(
                name: "IX_viaje_IdUsuario",
                table: "viaje",
                column: "IdUsuario");

            migrationBuilder.AddForeignKey(
                name: "FK_viaje_Usuarios_IdUsuario",
                table: "viaje",
                column: "IdUsuario",
                principalTable: "Usuarios",
                principalColumn: "IdPersonas",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_viaje_Usuarios_IdUsuario",
                table: "viaje");

            migrationBuilder.DropIndex(
                name: "IX_viaje_IdUsuario",
                table: "viaje");

            migrationBuilder.DropColumn(
                name: "IdUsuario",
                table: "viaje");
        }
    }
}
