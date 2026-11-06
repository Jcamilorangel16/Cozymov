using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class Viajes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "viaje",
                columns: table => new
                {
                    id_viaje = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_conductor = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    id_ruta = table.Column<long>(type: "bigint", nullable: false),
                    fecha_hora_salida = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    costo = table.Column<decimal>(type: "numeric(10,2)", nullable: false),
                    cupos_disponibles = table.Column<int>(type: "integer", nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_viaje", x => x.id_viaje);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "viaje");
        }
    }
}
