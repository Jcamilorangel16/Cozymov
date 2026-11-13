using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class RegistroPendienteConfiguration : IEntityTypeConfiguration<RegistroPendiente>
{
    public void Configure(EntityTypeBuilder<RegistroPendiente> entity)
    {
        entity.ToTable("registro_pendiente");
        entity.HasKey(registro => registro.IdRegistroPendiente);

        entity.Property(registro => registro.Correo)
            .HasMaxLength(150)
            .IsRequired();

        entity.Property(registro => registro.CodigoHash)
            .HasMaxLength(256)
            .IsRequired();

        entity.Property(registro => registro.TokenHash)
            .HasMaxLength(128);

        entity.Property(registro => registro.Intentos)
            .HasDefaultValue(0);

        entity.Property(registro => registro.Envios)
            .HasDefaultValue(0);

        entity.HasIndex(registro => registro.Correo)
            .IsUnique();
    }
}
