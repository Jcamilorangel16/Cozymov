using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("vehiculo")]
public class Vehiculo
{
    [Key]
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    [Required]
    public string Tipo { get; set; } = string.Empty;

    [Required]
    public string Modelo { get; set; } = string.Empty;

    public int Capacidad { get; set; }
    public string? Foto { get; set; }
    public int IdUsuario { get; set; }

    public Usuarios Usuario { get; set; } = null!;
    public Automovil? Automovil { get; set; }
    public Moto? Moto { get; set; }
    public Bicicleta? Bicicleta { get; set; }
    public ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
}
