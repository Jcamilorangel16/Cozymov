using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddVehiculosRelacionados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vehiculo",
                columns: table => new
                {
                    id_vehiculo = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "text", nullable: false),
                    Modelo = table.Column<string>(type: "text", nullable: false),
                    Capacidad = table.Column<int>(type: "integer", nullable: false),
                    Foto = table.Column<string>(type: "text", nullable: true),
                    IdUsuario = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vehiculo", x => x.id_vehiculo);
                });

            migrationBuilder.CreateTable(
                name: "automovil",
                columns: table => new
                {
                    id_vehiculo = table.Column<long>(type: "bigint", nullable: false),
                    numero_puertas = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_automovil", x => x.id_vehiculo);
                    table.CheckConstraint("ck_automovil_numero_puertas", "numero_puertas IN (2, 3, 4, 5)");
                    table.ForeignKey(
                        name: "FK_automovil_vehiculo_id_vehiculo",
                        column: x => x.id_vehiculo,
                        principalTable: "vehiculo",
                        principalColumn: "id_vehiculo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bicicleta_electrica",
                columns: table => new
                {
                    id_vehiculo = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bicicleta_electrica", x => x.id_vehiculo);
                    table.ForeignKey(
                        name: "FK_bicicleta_electrica_vehiculo_id_vehiculo",
                        column: x => x.id_vehiculo,
                        principalTable: "vehiculo",
                        principalColumn: "id_vehiculo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "moto",
                columns: table => new
                {
                    id_vehiculo = table.Column<long>(type: "bigint", nullable: false),
                    modalidad = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_moto", x => x.id_vehiculo);
                    table.ForeignKey(
                        name: "FK_moto_vehiculo_id_vehiculo",
                        column: x => x.id_vehiculo,
                        principalTable: "vehiculo",
                        principalColumn: "id_vehiculo",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "automovil");

            migrationBuilder.DropTable(
                name: "bicicleta_electrica");

            migrationBuilder.DropTable(
                name: "moto");

            migrationBuilder.DropTable(
                name: "vehiculo");
        }
    }
}
