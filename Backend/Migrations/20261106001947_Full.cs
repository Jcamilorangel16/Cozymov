using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Full : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Mensajes",
                columns: table => new
                {
                    IdMensaje = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    IdEmisor = table.Column<int>(type: "integer", nullable: false),
                    IdReceptor = table.Column<int>(type: "integer", nullable: false),
                    Contenido = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    FechaHora = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Leido = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mensajes", x => x.IdMensaje);
                    table.ForeignKey(
                        name: "FK_Mensajes_Usuarios_IdEmisor",
                        column: x => x.IdEmisor,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Mensajes_Usuarios_IdReceptor",
                        column: x => x.IdReceptor,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Mensajes_IdEmisor",
                table: "Mensajes",
                column: "IdEmisor");

            migrationBuilder.CreateIndex(
                name: "IX_Mensajes_IdReceptor",
                table: "Mensajes",
                column: "IdReceptor");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Mensajes");
        }
    }
}
