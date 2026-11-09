using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("bicicleta_electrica")]
public class Bicicleta
{
    [Column("id_vehiculo")]
    public long IdVehiculo { get; set; }

    public Vehiculo Vehiculo { get; set; } = null!;
}
