using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class BicicletaElectricaConfiguration : IEntityTypeConfiguration<BicicletaElectrica>
{
    public void Configure(EntityTypeBuilder<BicicletaElectrica> entity)
    {
        entity.ToTable("bicicleta_electrica", table =>
        {
            table.HasCheckConstraint(
                "ck_bicicleta_electrica_velocidad_maxima",
                "velocidad_maxima > 0");
            table.HasCheckConstraint(
                "ck_bicicleta_electrica_capacidad_peso",
                "capacidad_peso > 0");
        });

        entity.Property(b => b.NumeroSerie).HasColumnName("numero_serie").HasMaxLength(100);
        entity.HasIndex(b => b.NumeroSerie).IsUnique();
        entity.Property(b => b.VelocidadMaxima)
            .HasColumnName("velocidad_maxima")
            .HasPrecision(5, 2);
        entity.Property(b => b.CapacidadPeso)
            .HasColumnName("capacidad_peso")
            .HasPrecision(6, 2);
        entity.Property(b => b.CapacidadVehicular)
            .HasColumnName("capacidad_vehicular")
            .HasDefaultValue(false);
        entity.Property(b => b.Casco).HasColumnName("casco").HasDefaultValue(false);
        entity.Property(b => b.Chaleco).HasColumnName("chaleco").HasDefaultValue(false);
        entity.Property(b => b.Luces).HasColumnName("luces").HasDefaultValue(false);
    }
}
