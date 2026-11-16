using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class SolicitudDto
{
    public long IdSolicitud { get; set; }
    public int IdUsuario { get; set; }
    public long IdRuta { get; set; }
    public DateTime FechaHora { get; set; }
    public TimeOnly? HoraLimite { get; set; }
    public decimal? Presupuesto { get; set; }
    public bool Compartir { get; set; }
}

public class SolicitudCreateDto
{
    [Range(1, int.MaxValue)]
    public int IdUsuario { get; set; }

    [Range(1, long.MaxValue)]
    public long IdRuta { get; set; }

    public DateTime FechaHora { get; set; }
    public TimeOnly? HoraLimite { get; set; }

    [Range(0, 99999999.99)]
    public decimal? Presupuesto { get; set; }

    public bool Compartir { get; set; }
}

public class ViajeCoincidenciaDto
{
    public long IdViaje { get; set; }
    public DateTime FechaHoraSalida { get; set; }
    public decimal Costo { get; set; }
    public int CuposDisponibles { get; set; }
    public string Estado { get; set; } = string.Empty;
}
