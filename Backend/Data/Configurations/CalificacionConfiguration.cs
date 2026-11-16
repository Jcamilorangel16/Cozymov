using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations;

public sealed class CalificacionConfiguration : IEntityTypeConfiguration<Calificacion>
{
    public void Configure(EntityTypeBuilder<Calificacion> entity)
    {
        entity.ToTable("calificacion", t =>
            t.HasCheckConstraint("CK_calificacion_puntuacion", "\"puntuacion\" BETWEEN 1 AND 5"));
        entity.HasKey(c => c.IdCalificacion);
        entity.Property(c => c.IdCalificacion).UseIdentityByDefaultColumn();

        entity.HasOne(c => c.Reserva)
            .WithMany(r => r.Calificaciones)
            .HasForeignKey(c => c.IdReserva)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(c => c.Evaluador)
            .WithMany(u => u.CalificacionesEmitidas)
            .HasForeignKey(c => c.IdEvaluador)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);

        entity.HasOne(c => c.Evaluado)
            .WithMany(u => u.CalificacionesRecibidas)
            .HasForeignKey(c => c.IdEvaluado)
            .HasPrincipalKey(u => u.IdPersonas)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
