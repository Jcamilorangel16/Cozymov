using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class MotoConfiguration : IEntityTypeConfiguration<Moto>
{
    public void Configure(EntityTypeBuilder<Moto> entity)
    {
        entity.ToTable("moto");
        entity.HasKey(m => m.IdVehiculo);
        entity.Property(m => m.Modalidad)
            .HasColumnName("modalidad")
            .HasMaxLength(20)
            .IsRequired();
    }
}
