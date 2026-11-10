using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class RutaConfiguration : IEntityTypeConfiguration<Ruta>
{
    public void Configure(EntityTypeBuilder<Ruta> entity)
    {
        entity.ToTable("ruta");
        entity.HasKey(r => r.IdRuta);

        entity.Property(r => r.Origen)
            .HasMaxLength(200)
            .IsRequired();

        entity.Property(r => r.Destino)
            .HasMaxLength(200)
            .IsRequired();

        entity.Property(r => r.LatOrigen).HasColumnType("numeric(9,6)");
        entity.Property(r => r.LonOrigen).HasColumnType("numeric(9,6)");
        entity.Property(r => r.LatDestino).HasColumnType("numeric(9,6)");
        entity.Property(r => r.LonDestino).HasColumnType("numeric(9,6)");

        entity.HasMany(r => r.Viajes)
            .WithOne(v => v.Ruta)
            .HasForeignKey(v => v.IdRuta)
            .HasPrincipalKey(r => r.IdRuta)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
