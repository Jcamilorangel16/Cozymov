using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class TablasFaltantesPdf : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "calificacion",
                columns: table => new
                {
                    id_calificacion = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_reserva = table.Column<long>(type: "bigint", nullable: false),
                    id_evaluador = table.Column<int>(type: "integer", nullable: false),
                    id_evaluado = table.Column<int>(type: "integer", nullable: false),
                    puntuacion = table.Column<short>(type: "smallint", nullable: false),
                    comentario = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_calificacion", x => x.id_calificacion);
                    table.CheckConstraint("CK_calificacion_puntuacion", "\"puntuacion\" BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_calificacion_Usuarios_id_evaluado",
                        column: x => x.id_evaluado,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_calificacion_Usuarios_id_evaluador",
                        column: x => x.id_evaluador,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_calificacion_reserva_viaje_id_reserva",
                        column: x => x.id_reserva,
                        principalTable: "reserva_viaje",
                        principalColumn: "id_reserva",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "preferencia",
                columns: table => new
                {
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    prioridad_costo = table.Column<short>(type: "smallint", nullable: true),
                    prioridad_tiempo = table.Column<short>(type: "smallint", nullable: true),
                    preferir_compartir = table.Column<bool>(type: "boolean", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_preferencia", x => x.id_usuario);
                    table.ForeignKey(
                        name: "FK_preferencia_Usuarios_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "solicitud",
                columns: table => new
                {
                    id_solicitud = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    id_ruta = table.Column<long>(type: "bigint", nullable: false),
                    fecha_hora = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    hora_limite = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    presupuesto = table.Column<decimal>(type: "numeric(10,2)", nullable: true),
                    compartir = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitud", x => x.id_solicitud);
                    table.ForeignKey(
                        name: "FK_solicitud_Usuarios_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitud_ruta_id_ruta",
                        column: x => x.id_ruta,
                        principalTable: "ruta",
                        principalColumn: "id_ruta",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "telefono_usuario",
                columns: table => new
                {
                    id_telefono = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    id_usuario = table.Column<int>(type: "integer", nullable: false),
                    telefono = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_telefono_usuario", x => x.id_telefono);
                    table.ForeignKey(
                        name: "FK_telefono_usuario_Usuarios_id_usuario",
                        column: x => x.id_usuario,
                        principalTable: "Usuarios",
                        principalColumn: "IdPersonas",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_calificacion_id_evaluado",
                table: "calificacion",
                column: "id_evaluado");

            migrationBuilder.CreateIndex(
                name: "IX_calificacion_id_evaluador",
                table: "calificacion",
                column: "id_evaluador");

            migrationBuilder.CreateIndex(
                name: "IX_calificacion_id_reserva",
                table: "calificacion",
                column: "id_reserva");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_id_ruta",
                table: "solicitud",
                column: "id_ruta");

            migrationBuilder.CreateIndex(
                name: "IX_solicitud_id_usuario",
                table: "solicitud",
                column: "id_usuario");

            migrationBuilder.CreateIndex(
                name: "IX_telefono_usuario_id_usuario_telefono",
                table: "telefono_usuario",
                columns: new[] { "id_usuario", "telefono" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "calificacion");

            migrationBuilder.DropTable(
                name: "preferencia");

            migrationBuilder.DropTable(
                name: "solicitud");

            migrationBuilder.DropTable(
                name: "telefono_usuario");
        }
    }
}
