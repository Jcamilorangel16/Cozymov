using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class BicicletaConfiguration : IEntityTypeConfiguration<Bicicleta>
{
    public void Configure(EntityTypeBuilder<Bicicleta> entity)
    {
        entity.ToTable("bicicleta_electrica");
        entity.HasKey(b => b.IdVehiculo);
    }
}
