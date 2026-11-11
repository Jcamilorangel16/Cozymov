using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class ViajesApiFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE viaje
                    ADD COLUMN IF NOT EXISTS id_vehiculo bigint NULL,
                    ADD COLUMN IF NOT EXISTS punto_encuentro character varying(200) NULL,
                    ADD COLUMN IF NOT EXISTS informacion_adicional character varying(500) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // These columns may predate this migration in existing deployments.
        }
    }
}
