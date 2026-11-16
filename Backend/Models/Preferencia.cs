using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("preferencia")]
public class Preferencia
{
    [Key]
    [Column("id_usuario")]
    public int IdUsuario { get; set; }
    public Usuarios Usuario { get; set; } = null!;

    [Column("prioridad_costo")]
    public short? PrioridadCosto { get; set; }

    [Column("prioridad_tiempo")]
    public short? PrioridadTiempo { get; set; }

    [Column("preferir_compartir")]
    public bool? PreferirCompartir { get; set; }
}
