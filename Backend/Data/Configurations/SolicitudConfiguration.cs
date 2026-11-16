using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class SolicitudConfiguration : IEntityTypeConfiguration<Solicitud>
{
    public void Configure(EntityTypeBuilder<Solicitud> entity)
    {
        entity.ToTable("solicitud");
        entity.HasKey(s => s.IdSolicitud);
        entity.Property(s => s.IdSolicitud).UseIdentityByDefaultColumn();

        entity.HasOne(s => s.Usuario)
            .WithMany(u => u.Solicitudes)
            .HasForeignKey(s => s.IdUsuario)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(s => s.Ruta)
            .WithMany(r => r.Solicitudes)
            .HasForeignKey(s => s.IdRuta)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
