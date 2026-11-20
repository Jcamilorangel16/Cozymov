using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models;

[Table("automovil")]
public class Automovil : Vehiculo
{
    [Column("numero_puertas")]
    [Range(2, 5)]
    public short NumeroPuertas { get; set; }

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
}
