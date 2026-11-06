using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("viaje")]
    public class Viaje
    {
        [Key]
        [Column("id_viaje")]
        public long IdViaje { get; set; }

        [Column("id_conductor")]
        [StringLength(20)]
        public string IdConductor { get; set; } = string.Empty;

        [Column("id_ruta")]
        public long IdRuta { get; set; }

        [Column("fecha_hora_salida", TypeName = "timestamp without time zone")]
        public DateTime FechaHoraSalida { get; set; }

        [Column("costo", TypeName = "numeric(10,2)")]
        [Range(0, 99999999.99)]
        public decimal Costo { get; set; }

        [Column("cupos_disponibles")]
        public int CuposDisponibles { get; set; }

        [Column("estado")]
        [StringLength(20)]
        public string Estado { get; set; } = string.Empty;
    }
}

