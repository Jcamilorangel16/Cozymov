using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ReservasViaje : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "reserva_viaje",
                columns: table => new
                {
                    id_reserva = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_viaje = table.Column<long>(type: "bigint", nullable: false),
                    id_pasajero = table.Column<int>(type: "integer", nullable: false),
                    fecha_reserva = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    estado = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_reserva_viaje", x => x.id_reserva);
                    table.ForeignKey(
                        name: "FK_reserva_viaje_Usuarios_id_pasajero",
                        column: x => x.id_pasajero,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_reserva_viaje_viaje_id_viaje",
                        column: x => x.id_viaje,
                        principalTable: "viaje",
                        principalColumn: "id_viaje",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_reserva_viaje_id_pasajero_estado",
                table: "reserva_viaje",
                columns: new[] { "id_pasajero", "estado" },
                unique: true,
                filter: "\"estado\" = 'activa'");

            migrationBuilder.CreateIndex(
                name: "IX_reserva_viaje_id_viaje_id_pasajero",
                table: "reserva_viaje",
                columns: new[] { "id_viaje", "id_pasajero" },
                unique: true,
                filter: "\"estado\" = 'activa'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "reserva_viaje");
        }
    }
}
