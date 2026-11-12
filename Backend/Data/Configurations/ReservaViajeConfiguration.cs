using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class ReservaViajeConfiguration : IEntityTypeConfiguration<ReservaViaje>
{
    public void Configure(EntityTypeBuilder<ReservaViaje> entity)
    {
        entity.ToTable("reserva_viaje");
        entity.HasKey(reserva => reserva.IdReserva);
        entity.Property(reserva => reserva.IdReserva).UseIdentityByDefaultColumn();
        entity.Property(reserva => reserva.Estado).HasMaxLength(20).IsRequired();

        entity.HasOne(reserva => reserva.Viaje)
            .WithMany()
            .HasForeignKey(reserva => reserva.IdViaje)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(reserva => reserva.Pasajero)
            .WithMany()
            .HasForeignKey(reserva => reserva.IdPasajero)
            .HasPrincipalKey(usuario => usuario.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasIndex(reserva => new { reserva.IdPasajero, reserva.Estado })
            .IsUnique()
            .HasFilter("\"estado\" = 'activa'");
        entity.HasIndex(reserva => new { reserva.IdViaje, reserva.IdPasajero })
            .IsUnique()
            .HasFilter("\"estado\" = 'activa'");
    }
}
