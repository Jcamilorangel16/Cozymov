using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class AutomovilConfiguration : IEntityTypeConfiguration<Automovil>
{
    public void Configure(EntityTypeBuilder<Automovil> entity)
    {
        entity.ToTable("automovil", table => table.HasCheckConstraint(
            "ck_automovil_numero_puertas",
            "numero_puertas IN (2, 3, 4, 5)"));
        entity.Property(a => a.NumeroPuertas).HasColumnName("numero_puertas");
        entity.Property(a => a.FotoPlaca).HasColumnName("foto_placa").HasMaxLength(500).IsRequired(false);
        entity.Property(a => a.FotoLicencia).HasColumnName("foto_licencia").HasMaxLength(500).IsRequired(false);
        entity.Property(a => a.DocTecnomecanica).HasColumnName("doc_tecnomecanica").HasMaxLength(500).IsRequired(false);
        entity.Property(a => a.DocSoat).HasColumnName("doc_soat").HasMaxLength(500).IsRequired(false);
    }
}
