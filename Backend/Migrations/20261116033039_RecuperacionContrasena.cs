using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class RecuperacionContrasena : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CodigoRecuperacionEnviado",
                table: "Usuarios",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CodigoRecuperacionHash",
                table: "Usuarios",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CodigoRecuperacionIntentos",
                table: "Usuarios",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "CodigoRecuperacionVence",
                table: "Usuarios",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodigoRecuperacionEnviado",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "CodigoRecuperacionHash",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "CodigoRecuperacionIntentos",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "CodigoRecuperacionVence",
                table: "Usuarios");
        }
    }
}
