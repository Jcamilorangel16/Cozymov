using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class IdentidadExterna : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "identidad_externa",
                columns: table => new
                {
                    id_identidad = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    proveedor = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    sub = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    fecha_vinculacion = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_identidad_externa", x => x.id_identidad);
                    table.ForeignKey(
                        name: "FK_identidad_externa_Usuarios_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_identidad_externa_id_usuario",
                table: "identidad_externa",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_identidad_externa_proveedor_sub",
                table: "identidad_externa",
                columns: new[] { "proveedor", "sub" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "identidad_externa");
        }
    }
}
