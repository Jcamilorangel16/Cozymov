using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class conectado : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_vehiculo_IdUsuario",
                table: "vehiculo",
                column: "IdUsuario");

            migrationBuilder.AddForeignKey(
                name: "FK_vehiculo_Usuarios_IdUsuario",
                table: "vehiculo",
                column: "IdUsuario",
                principalTable: "Usuarios",
                principalColumn: "IdPersonas",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_vehiculo_Usuarios_IdUsuario",
                table: "vehiculo");

            migrationBuilder.DropIndex(
                name: "IX_vehiculo_IdUsuario",
                table: "vehiculo");
        }
    }
}
