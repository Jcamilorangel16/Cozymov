using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailVerificationRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VerificacionesCorreo",
                columns: table => new
                {
                    Correo = table.Column<string>(type: "text", nullable: false),
                    CodigoHash = table.Column<string>(type: "text", nullable: true),
                    ExpiraEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    VerificadoEn = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IntentosFallidos = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VerificacionesCorreo", x => x.Correo);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VerificacionesCorreo");
        }
    }
}
