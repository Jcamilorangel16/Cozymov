using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class IdentidadExternaConfiguration : IEntityTypeConfiguration<IdentidadExterna>
{
    public void Configure(EntityTypeBuilder<IdentidadExterna> entity)
    {
        entity.ToTable("identidad_externa");
        entity.HasKey(i => i.IdIdentidad);
        entity.Property(i => i.IdIdentidad).UseIdentityByDefaultColumn();
        entity.Property(i => i.Proveedor).HasMaxLength(30).IsRequired();
        entity.Property(i => i.Sub).HasMaxLength(255).IsRequired();

        entity.HasOne(i => i.Usuario)
            .WithMany()
            .HasForeignKey(i => i.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Cascade);

        // Una identidad externa pertenece a una sola cuenta.
        entity.HasIndex(i => new { i.Proveedor, i.Sub }).IsUnique();
    }
}
