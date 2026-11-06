using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Backend.Data.Configurations
{
    public class MensajeConfiguration : IEntityTypeConfiguration<Mensaje>
    {
        public void Configure(EntityTypeBuilder<Mensaje> e)
        {
            e.ToTable("mensaje", t =>
                t.HasCheckConstraint("ck_mensaje_emisor_receptor", "id_emisor <> id_receptor"));

            e.HasKey(m => m.IdMensaje);

            e.Property(m => m.IdMensaje)
                .HasColumnName("id_mensaje")
                .ValueGeneratedOnAdd();

            e.Property(m => m.IdEmisor)
                .HasColumnName("id_emisor")
                .IsRequired();

            e.Property(m => m.IdReceptor)
                .HasColumnName("id_receptor")
                .IsRequired();

            e.Property(m => m.Contenido)
                .HasColumnName("contenido")
                .HasMaxLength(500)
                .IsRequired();

            e.Property(m => m.FechaHora)
                .HasColumnName("fecha_hora")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            e.Property(m => m.Leido)
                .HasColumnName("leido")
                .HasDefaultValue(false);

            e.HasOne(m => m.Emisor)
                .WithMany()
                .HasForeignKey(m => m.IdEmisor)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(m => m.Receptor)
                .WithMany()
                .HasForeignKey(m => m.IdReceptor)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
