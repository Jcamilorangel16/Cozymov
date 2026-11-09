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
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
