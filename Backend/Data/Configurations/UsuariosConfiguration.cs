using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class UsuariosConfiguration : IEntityTypeConfiguration<Usuarios>
{
    public void Configure(EntityTypeBuilder<Usuarios> entity)
    {
        entity.ToTable("Usuarios");
        entity.HasKey(u => u.IdPersonas);
        entity.Property(u => u.FotoPerfil).HasColumnName("foto_perfil");
        entity.Property(u => u.Descripcion).HasColumnName("descripcion").HasMaxLength(160);
    }
}
