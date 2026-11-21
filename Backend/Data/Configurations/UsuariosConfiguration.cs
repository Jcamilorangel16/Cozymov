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
    }
}
