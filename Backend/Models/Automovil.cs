using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("automovil")]
public class Automovil
{
    [Key]
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    [Column("numero_puertas")]
    [Range(2, 5)]
    public short NumeroPuertas { get; set; }

    [JsonIgnore]
    public Vehiculo Vehiculo { get; set; } = null!;
}
