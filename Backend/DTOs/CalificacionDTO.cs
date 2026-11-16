using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class CalificacionDto
{
    public long IdCalificacion { get; set; }
    public long IdReserva { get; set; }
    public int IdEvaluador { get; set; }
    public int IdEvaluado { get; set; }
    public short Puntuacion { get; set; }
    public string? Comentario { get; set; }
}

public class CalificacionCreateDto
{
    [Range(1, long.MaxValue)]
    public long IdReserva { get; set; }

    [Range(1, int.MaxValue)]
    public int IdEvaluador { get; set; }

    [Range(1, int.MaxValue)]
    public int IdEvaluado { get; set; }

    [Range(1, 5)]
    public short Puntuacion { get; set; }

    [StringLength(500)]
    public string? Comentario { get; set; }
}

public class CalificacionResumenDto
{
    public int IdEvaluado { get; set; }
    public int Total { get; set; }
    public double? Promedio { get; set; }
}
