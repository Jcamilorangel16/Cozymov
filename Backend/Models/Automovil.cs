using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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

    public Vehiculo Vehiculo { get; set; } = null!;
}
