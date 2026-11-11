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

    [JsonIgnore]
    public Vehiculo Vehiculo { get; set; } = null!;
}
