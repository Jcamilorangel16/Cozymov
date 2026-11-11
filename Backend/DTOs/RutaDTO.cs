using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class RutaDto
{
    public long IdRuta { get; set; }
    public string Origen { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public decimal LatOrigen { get; set; }
    public decimal LonOrigen { get; set; }
    public decimal LatDestino { get; set; }
    public decimal LonDestino { get; set; }
}

public class RutaCreateDto
{
    [Required, StringLength(200)]
    public string Origen { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string Destino { get; set; } = string.Empty;

    [Range(-90, 90)]
    public decimal LatOrigen { get; set; }

    [Range(-180, 180)]
    public decimal LonOrigen { get; set; }

    [Range(-90, 90)]
    public decimal LatDestino { get; set; }

    [Range(-180, 180)]
    public decimal LonDestino { get; set; }
}
