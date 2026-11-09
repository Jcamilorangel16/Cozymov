using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class MensajeConfiguration : IEntityTypeConfiguration<Mensaje>
{
    public void Configure(EntityTypeBuilder<Mensaje> entity)
    {
        entity.ToTable("Mensajes");
        entity.HasKey(m => m.IdMensaje);
        entity.Property(m => m.Contenido).IsRequired().HasMaxLength(500);
        entity.Property(m => m.FechaHora).HasColumnType("timestamp with time zone");
        entity.Property(m => m.Leido).HasDefaultValue(false);

        entity.HasOne(m => m.Emisor)
            .WithMany()
            .HasForeignKey(m => m.IdEmisor)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(m => m.Receptor)
            .WithMany()
            .HasForeignKey(m => m.IdReceptor)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
