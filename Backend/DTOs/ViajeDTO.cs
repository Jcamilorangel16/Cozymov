using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class ViajeListaDTO
    {
        public long IdViaje { get; set; }
        public string IdConductor { get; set; } = string.Empty;
        public long IdRuta { get; set; }
        public DateTime FechaHoraSalida { get; set; }
        public decimal Costo { get; set; }
        public int CuposDisponibles { get; set; } 
        public string Estado { get; set; } = string.Empty; 
    }

    public class ViajeDTO
    {
        public long IdViaje { get; set; }
        public string IdConductor { get; set; } = string.Empty;
        public long IdRuta { get; set; }
        public DateTime FechaHoraSalida { get; set; } 
        public decimal Costo { get; set; }
        public int CuposDisponibles { get; set; }
        public string Estado { get; set; } = string.Empty;
    }

    public class ViajeCreateDTO
    {
        [Required, StringLength(20)]
        public string IdConductor { get; set; } = string.Empty;

        [Range(1, long.MaxValue)]
        public long IdRuta { get; set; }

        [Required]
        public DateTime FechaHoraSalida { get; set; }

        [Range(0, 99999999.99)]
        public decimal Costo { get; set; }

        [Range(0, int.MaxValue)]
        public int CuposDisponibles { get; set; }

        [Required, StringLength(20)]
        public string Estado { get; set; } = string.Empty;
    }
}