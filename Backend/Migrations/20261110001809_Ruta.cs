using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Ruta : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "IdUsuario",
                table: "viaje",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "ruta",
                columns: table => new
                {
                    id_ruta = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    origen = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    destino = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    lat_origen = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    lon_origen = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    lat_destino = table.Column<decimal>(type: "numeric(9,6)", nullable: false),
                    lon_destino = table.Column<decimal>(type: "numeric(9,6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ruta", x => x.id_ruta);
                });

            migrationBuilder.CreateIndex(
                name: "IX_viaje_id_ruta",
                table: "viaje",
                column: "id_ruta");

            migrationBuilder.AddForeignKey(
                name: "FK_viaje_ruta_id_ruta",
                table: "viaje",
                column: "id_ruta",
                principalTable: "ruta",
                principalColumn: "id_ruta",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_viaje_ruta_id_ruta",
                table: "viaje");

            migrationBuilder.DropTable(
                name: "ruta");

            migrationBuilder.DropIndex(
                name: "IX_viaje_id_ruta",
                table: "viaje");

            migrationBuilder.AlterColumn<int>(
                name: "IdUsuario",
                table: "viaje",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");
        }
    }
}
