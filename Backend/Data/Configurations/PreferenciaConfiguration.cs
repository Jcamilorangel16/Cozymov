using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class PreferenciaConfiguration : IEntityTypeConfiguration<Preferencia>
{
    public void Configure(EntityTypeBuilder<Preferencia> entity)
    {
        entity.ToTable("preferencia");
        entity.HasKey(p => p.IdUsuario);

        entity.HasOne(p => p.Usuario)
            .WithOne(u => u.Preferencia)
            .HasForeignKey<Preferencia>(p => p.IdUsuario)
            .HasPrincipalKey<Usuarios>(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
