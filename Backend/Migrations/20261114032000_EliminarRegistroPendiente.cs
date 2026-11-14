using Backend.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261114032000_EliminarRegistroPendiente")]
public partial class EliminarRegistroPendiente : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "registro_pendiente");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "registro_pendiente",
            columns: table => new
            {
                id_registro_pendiente = table.Column<long>(type: "bigint", nullable: false)
                    .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
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
}
