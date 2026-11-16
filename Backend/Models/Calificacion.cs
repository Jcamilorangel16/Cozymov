using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("calificacion")]
public class Calificacion
{
    [Key]
    [Column("id_calificacion")]
    public long IdCalificacion { get; set; }

    [Column("id_reserva")]
    public long IdReserva { get; set; }
    public ReservaViaje Reserva { get; set; } = null!;

    [Column("id_evaluador")]
    public int IdEvaluador { get; set; }
    public Usuarios Evaluador { get; set; } = null!;

    [Column("id_evaluado")]
    public int IdEvaluado { get; set; }
    public Usuarios Evaluado { get; set; } = null!;

    [Column("puntuacion")]
    [Range(1, 5)]
    public short Puntuacion { get; set; }

    [Column("comentario")]
    [StringLength(500)]
    public string? Comentario { get; set; }
}
