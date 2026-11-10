using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("bicicleta_electrica")]
public class Bicicleta
{
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    [JsonIgnore]
    public Vehiculo Vehiculo { get; set; } = null!;
}
