using Backend.Models;
using Microsoft.EntityFrameworkCore;
namespace Backend.Data

{
    public class AppDbContext : DbContext
    {
        public DbSet<Backend.Models.Mensaje> Mensaje { get; set; } = default!;
        public AppDbContext(DbContextOptions <AppDbContext> options) : base(options)
        {

        }
        public DbSet<Usuarios> Usuarios { get; set;}
        public DbSet<Viaje> Viajes { get; set; }
        public DbSet<Mensaje> Mensajes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Mensaje>(entity =>
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
            });
        }

    }
}
