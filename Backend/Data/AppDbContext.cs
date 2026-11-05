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
        public DbSet<Mensaje> Mensajes { get; set; }


    }
}
