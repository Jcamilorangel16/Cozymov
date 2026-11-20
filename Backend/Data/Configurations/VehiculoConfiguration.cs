using Backend.Models;
using Backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class VehiculoConfiguration : IEntityTypeConfiguration<Vehiculo>
{
    public void Configure(EntityTypeBuilder<Vehiculo> entity)
    {
        entity.UseTptMappingStrategy();
        entity.ToTable("vehiculo", table => table.HasCheckConstraint(
            "ck_vehiculo_tipo",
            TiposVehiculo.SqlCheck));
        entity.HasKey(v => v.IdVehiculo);

        entity.Property(v => v.IdVehiculo).HasColumnName("id_vehiculo");
        entity.Property(v => v.IdUsuario).HasColumnName("id_usuario");
        entity.Property(v => v.Tipo).HasColumnName("tipo").HasMaxLength(30).IsRequired();
        entity.Property(v => v.Marca).HasColumnName("marca").HasMaxLength(100).IsRequired(false);
        entity.Property(v => v.Modelo).HasColumnName("modelo").HasMaxLength(50).IsRequired();
        entity.Property(v => v.Capacidad).HasColumnName("capacidad");
        entity.Property(v => v.Foto).HasColumnName("foto_vehiculo").HasMaxLength(500);
        entity.Property(v => v.FotoFrontal).HasColumnName("foto_frontal").HasMaxLength(500);
        entity.Property(v => v.FotoLateral).HasColumnName("foto_lateral").HasMaxLength(500);
        entity.Property(v => v.FotoPerfil).HasColumnName("foto_perfil").HasMaxLength(500);

        entity.HasOne(v => v.Usuario)
            .WithMany(u => u.Vehiculos)
            .HasForeignKey(v => v.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
