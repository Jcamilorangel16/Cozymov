using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class VerificacionCorreo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EmailVerificado",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "registro_pendiente",
                columns: table => new
                {
                    id_registro_pendiente = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    correo = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    codigo_hash = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: false),
                    codigo_expira_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    intentos = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    envios = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    primer_envio_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ultimo_envio_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    verificado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    token_hash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    token_expira_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    creado_en = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registro_pendiente", x => x.id_registro_pendiente);
                });

            migrationBuilder.CreateIndex(
                name: "IX_registro_pendiente_correo",
                table: "registro_pendiente",
                column: "correo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "registro_pendiente");

            migrationBuilder.DropColumn(
                name: "EmailVerificado",
                table: "Usuarios");
        }
    }
}
