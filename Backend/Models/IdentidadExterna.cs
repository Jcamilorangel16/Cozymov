using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

/// <summary>
/// Vincula una cuenta de Cozymov con la identidad estable de un proveedor
/// externo (por ejemplo, el <c>sub</c> de Google).
/// </summary>
[Table("identidad_externa")]
public class IdentidadExterna
{
    [Key]
    [Column("id_identidad")]
    public long IdIdentidad { get; set; }

    [Column("id_usuario")]
    public int IdUsuario { get; set; }
    public Usuarios Usuario { get; set; } = null!;

    [Required, StringLength(30)]
    [Column("proveedor")]
    public string Proveedor { get; set; } = string.Empty;

    [Required, StringLength(255)]
    [Column("sub")]
    public string Sub { get; set; } = string.Empty;

    [Column("fecha_vinculacion")]
    public DateTime FechaVinculacion { get; set; } = DateTime.UtcNow;
}
