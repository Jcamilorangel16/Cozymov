using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("solicitud")]
public class Solicitud
{
    [Key]
    [Column("id_solicitud")]
    public long IdSolicitud { get; set; }

    [Column("id_usuario")]
    public int IdUsuario { get; set; }
    public Usuarios Usuario { get; set; } = null!;

    [Column("id_ruta")]
    public long IdRuta { get; set; }
    public Ruta Ruta { get; set; } = null!;

    [Column("fecha_hora", TypeName = "timestamp without time zone")]
    public DateTime FechaHora { get; set; }

    [Column("hora_limite")]
    public TimeOnly? HoraLimite { get; set; }

    [Column("presupuesto", TypeName = "numeric(10,2)")]
    public decimal? Presupuesto { get; set; }

    [Column("compartir")]
    public bool Compartir { get; set; }
}
