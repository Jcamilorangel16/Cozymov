using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class MotoConfiguration : IEntityTypeConfiguration<Moto>
{
    public void Configure(EntityTypeBuilder<Moto> entity)
    {
        entity.ToTable("moto");
        entity.Property(m => m.Modalidad)
            .HasColumnName("modalidad")
            .HasMaxLength(20)
            .IsRequired();
        entity.Property(m => m.FotoPlaca).HasColumnName("foto_placa").HasMaxLength(500).IsRequired(false);
        entity.Property(m => m.FotoLicencia).HasColumnName("foto_licencia").HasMaxLength(500).IsRequired(false);
        entity.Property(m => m.DocTecnomecanica).HasColumnName("doc_tecnomecanica").HasMaxLength(500).IsRequired(false);
        entity.Property(m => m.DocSoat).HasColumnName("doc_soat").HasMaxLength(500).IsRequired(false);
    }
}
