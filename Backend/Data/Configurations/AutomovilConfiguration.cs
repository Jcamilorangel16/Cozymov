using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class AutomovilConfiguration : IEntityTypeConfiguration<Automovil>
{
    public void Configure(EntityTypeBuilder<Automovil> entity)
    {
        entity.ToTable("automovil", table => table.HasCheckConstraint(
            "ck_automovil_numero_puertas",
            "numero_puertas IN (2, 3, 4, 5)"));

        entity.HasKey(a => a.IdVehiculo);
        entity.Property(a => a.NumeroPuertas).HasColumnName("numero_puertas");
    }
}
