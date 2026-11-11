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

        public int IdUsuario { get; set; }
        public Usuarios Usuario { get; set; } = null!;

        [Column("id_ruta")]
        public long? IdRuta { get; set; }
        public Ruta? Ruta { get; set; }

        [Column("id_vehiculo")]
        public long? IdVehiculo { get; set; }

        [Column("origen")]
        [StringLength(200)]
        public string? Origen { get; set; }

        [Column("destino")]
        [StringLength(200)]
        public string? Destino { get; set; }

        [Column("punto_encuentro")]
        [StringLength(200)]
        public string? PuntoEncuentro { get; set; }

        [Column("informacion_adicional")]
        [StringLength(500)]
        public string? InformacionAdicional { get; set; }

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
