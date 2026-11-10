using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("ruta")]
public class Ruta
{
    [Key]
    [Column("id_ruta")]
    public long IdRuta { get; set; }

    [Required, StringLength(200)]
    [Column("origen")]
    public string Origen { get; set; } = string.Empty;

    [Required, StringLength(200)]
    [Column("destino")]
    public string Destino { get; set; } = string.Empty;

    [Column("lat_origen", TypeName = "numeric(9,6)")]
    [Range(-90, 90)]
    public decimal LatOrigen { get; set; }

    [Column("lon_origen", TypeName = "numeric(9,6)")]
    [Range(-180, 180)]
    public decimal LonOrigen { get; set; }

    [Column("lat_destino", TypeName = "numeric(9,6)")]
    [Range(-90, 90)]
    public decimal LatDestino { get; set; }

    [Column("lon_destino", TypeName = "numeric(9,6)")]
    [Range(-180, 180)]
    public decimal LonDestino { get; set; }

    public ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
}
