using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("vehiculo")]
public class Vehiculo
{
    [Key]
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    [StringLength(100)]
    [Column("marca")]
    public string? Marca { get; set; }

    [Required]
    [Column("tipo")]
    public string Tipo { get; set; } = string.Empty;

    [Required]
    [Column("modelo")]
    public string Modelo { get; set; } = string.Empty;

    [Column("capacidad")]
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

    [Column("id_usuario")]
    public int IdUsuario { get; set; }

    public Usuarios Usuario { get; set; } = null!;
}
