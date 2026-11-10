using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Usuarios> Usuarios { get; set; }
    public DbSet<Viaje> Viajes { get; set; }
    public DbSet<Ruta> Rutas { get; set; }
    public DbSet<Mensaje> Mensajes { get; set; }
    public DbSet<Vehiculo> Vehiculos => Set<Vehiculo>();
    public DbSet<Automovil> Automoviles => Set<Automovil>();
    public DbSet<Moto> Motos => Set<Moto>();
    public DbSet<Bicicleta> Bicicletas => Set<Bicicleta>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
