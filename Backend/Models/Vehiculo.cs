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
    [StringLength(100)]
    [Column("marca")]
    public string Marca { get; set; } = string.Empty;

    [Required]
    public string Tipo { get; set; } = string.Empty;

    [Required]
    public string Modelo { get; set; } = string.Empty;

    public int Capacidad { get; set; }
    public string? Foto { get; set; }

    [StringLength(500)]
    [Column("foto_frontal")]
    public string? FotoFrontal { get; set; }

    [StringLength(500)]
    [Column("foto_lateral")]
    public string? FotoLateral { get; set; }

    [StringLength(500)]
    [Column("foto_perfil")]
    public string? FotoPerfil { get; set; }

    public int IdUsuario { get; set; }

    public Usuarios Usuario { get; set; } = null!;
    public Automovil? Automovil { get; set; }
    public Moto? Moto { get; set; }
    public Bicicleta? Bicicleta { get; set; }
}
