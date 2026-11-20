using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("moto")]
public class Moto
{
    [Key]
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    [Required]
    [StringLength(20)]
    public string Modalidad { get; set; } = string.Empty;

    [StringLength(500)]
    [Column("foto_placa")]
    public string? FotoPlaca { get; set; }

    [StringLength(500)]
    [Column("foto_licencia")]
    public string? FotoLicencia { get; set; }

    [StringLength(500)]
    [Column("doc_tecnomecanica")]
    public string? DocTecnomecanica { get; set; }

    [StringLength(500)]
    [Column("doc_soat")]
    public string? DocSoat { get; set; }

    [JsonIgnore]
    public Vehiculo Vehiculo { get; set; } = null!;
}
