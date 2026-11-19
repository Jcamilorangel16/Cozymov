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
    public string Estado { get; set; } = string.Empty;
    public long? IdViaje { get; set; }

    /// <summary>Origen y destino tomados de la ruta referenciada.</summary>
    public string? Origen { get; set; }
    public string? Destino { get; set; }
}

public class SolicitudCreateDto
{
    [Range(1, int.MaxValue)]
    public int IdUsuario { get; set; }

    /// <summary>Ruta existente. Si es 0 se resuelve (o se crea) a partir de Origen y Destino.</summary>
    [Range(0, long.MaxValue)]
    public long IdRuta { get; set; }

    [StringLength(200)]
    public string? Origen { get; set; }

    [StringLength(200)]
    public string? Destino { get; set; }

    // Coordenadas opcionales del barrio; solo se usan al crear una ruta nueva.
    [Range(-90, 90)]
    public decimal? LatOrigen { get; set; }

    [Range(-180, 180)]
    public decimal? LonOrigen { get; set; }

    [Range(-90, 90)]
    public decimal? LatDestino { get; set; }

    [Range(-180, 180)]
    public decimal? LonDestino { get; set; }

    public DateTime FechaHora { get; set; }
    public TimeOnly? HoraLimite { get; set; }

    [Range(0, 99999999.99)]
    public decimal? Presupuesto { get; set; }

    public bool Compartir { get; set; }
}

/// <summary>Solicitud pendiente vista por un conductor, con el nombre de quien la pidió.</summary>
public class SolicitudPendienteDto
{
    public long IdSolicitud { get; set; }
    public int IdUsuario { get; set; }
    public string NombreUsuario { get; set; } = string.Empty;
    public string? Origen { get; set; }
    public string? Destino { get; set; }
    public DateTime FechaHora { get; set; }
    public TimeOnly? HoraLimite { get; set; }
    public decimal? Presupuesto { get; set; }
    public bool Compartir { get; set; }
}

public class SolicitudAceptarDto
{
    [Range(1, int.MaxValue)]
    public int IdConductor { get; set; }
}

public class ViajeCoincidenciaDto
{
    public long IdViaje { get; set; }
    public DateTime FechaHoraSalida { get; set; }
    public decimal Costo { get; set; }
    public int CuposDisponibles { get; set; }
    public string Estado { get; set; } = string.Empty;
}
