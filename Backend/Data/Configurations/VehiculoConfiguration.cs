using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class VehiculoConfiguration : IEntityTypeConfiguration<Vehiculo>
{
    public void Configure(EntityTypeBuilder<Vehiculo> entity)
    {
        entity.ToTable("vehiculo");
        entity.HasKey(v => v.IdVehiculo);

        entity.HasOne(v => v.Usuario)
            .WithMany(u => u.Vehiculos)
            .HasForeignKey(v => v.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(v => v.Automovil)
            .WithOne(a => a.Vehiculo)
            .HasForeignKey<Automovil>(a => a.IdVehiculo)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(v => v.Moto)
            .WithOne(m => m.Vehiculo)
            .HasForeignKey<Moto>(m => m.IdVehiculo)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(v => v.Bicicleta)
            .WithOne(b => b.Vehiculo)
            .HasForeignKey<Bicicleta>(b => b.IdVehiculo)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
