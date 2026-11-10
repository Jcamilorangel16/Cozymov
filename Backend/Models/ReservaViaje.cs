using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models;

[Table("reserva_viaje")]
public class ReservaViaje
{
    [Key]
    [Column("id_reserva")]
    public long IdReserva { get; set; }

    [Column("id_viaje")]
    public long IdViaje { get; set; }
    public Viaje Viaje { get; set; } = null!;

    [Column("id_pasajero")]
    public int IdPasajero { get; set; }
    public Usuarios Pasajero { get; set; } = null!;

    [Column("fecha_reserva", TypeName = "timestamp without time zone")]
    public DateTime FechaReserva { get; set; }

    [Column("estado")]
    [StringLength(20)]
    public string Estado { get; set; } = "activa";
}
