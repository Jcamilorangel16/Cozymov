using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class ViajeConfiguration : IEntityTypeConfiguration<Viaje>
{
    public void Configure(EntityTypeBuilder<Viaje> entity)
    {
        entity.ToTable("viaje");
        entity.HasKey(v => v.IdViaje);

        entity.HasOne(v => v.Usuario)
            .WithMany(u => u.Viajes)
            .HasForeignKey(v => v.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(v => v.Vehiculo)
            .WithMany(vehiculo => vehiculo.Viajes)
            .HasForeignKey(v => v.IdVehiculo)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
