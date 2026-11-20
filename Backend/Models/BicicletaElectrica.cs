using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("bicicleta_electrica")]
public class BicicletaElectrica : Vehiculo
{
    [Required]
    [StringLength(100)]
    [Column("numero_serie")]
    public string NumeroSerie { get; set; } = string.Empty;

    [Range(typeof(decimal), "0.01", "999.99")]
    [Column("velocidad_maxima", TypeName = "numeric(5,2)")]
    public decimal VelocidadMaxima { get; set; }

    [Range(typeof(decimal), "0.01", "9999.99")]
    [Column("capacidad_peso", TypeName = "numeric(6,2)")]
    public decimal CapacidadPeso { get; set; }

    [Column("capacidad_vehicular")]
    public bool CapacidadVehicular { get; set; }

    [Column("casco")]
    public bool Casco { get; set; }

    [Column("chaleco")]
    public bool Chaleco { get; set; }

    [Column("luces")]
    public bool Luces { get; set; }

}
