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

        // Token de concurrencia: si dos conductores aceptan a la vez, el segundo recibe conflicto.
        entity.Property(s => s.Estado)
            .HasMaxLength(20)
            .HasDefaultValue(Solicitud.EstadoPendiente)
            .IsConcurrencyToken();

        // Al borrar el viaje privado la solicitud se conserva y queda sin viaje asociado.
        entity.HasOne(s => s.Viaje)
            .WithMany()
            .HasForeignKey(s => s.IdViaje)
            .OnDelete(DeleteBehavior.SetNull);

        entity.HasIndex(s => s.Estado);
    }
}
