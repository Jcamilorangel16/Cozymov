using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class TelefonoUsuarioConfiguration : IEntityTypeConfiguration<TelefonoUsuario>
{
    public void Configure(EntityTypeBuilder<TelefonoUsuario> entity)
    {
        entity.ToTable("telefono_usuario");
        entity.HasKey(t => t.IdTelefono);
        entity.Property(t => t.IdTelefono).UseIdentityByDefaultColumn();
        entity.Property(t => t.Telefono).HasMaxLength(20).IsRequired();

        entity.HasOne(t => t.Usuario)
            .WithMany(u => u.Telefonos)
            .HasForeignKey(t => t.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasIndex(t => new { t.IdUsuario, t.Telefono }).IsUnique();
    }
}
