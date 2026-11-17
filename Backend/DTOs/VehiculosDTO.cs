using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class VehiculoDto
    {
        public string Tipo { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string? Foto { get; set; }
        public int IdUsuario { get; set; }
    }

    public class VehiculoCreateDto
    {
        [Required, StringLength(30)]
        public string Tipo { get; set; } = string.Empty;
        [Required, StringLength(50)]
        public string Modelo { get; set; } = string.Empty;
        [Range(1, 32767)]
        public int Capacidad { get; set; }
        [StringLength(255)]
        public string? Foto { get; set; }
        [Range(1, int.MaxValue)]
        public int IdUsuario { get; set; }
    }

    /// <summary>
    /// Edición de un vehículo. No incluye IdUsuario: la propiedad no se puede reasignar.
    /// </summary>
    public class VehiculoUpdateDto
    {
        [Required, StringLength(30)]
        public string Tipo { get; set; } = string.Empty;
        [Required, StringLength(50)]
        public string Modelo { get; set; } = string.Empty;
        [Range(1, 32767)]
        public int Capacidad { get; set; }
        [StringLength(255)]
        public string? Foto { get; set; }
        [Range(2, 5)]
        public short? NumeroPuertas { get; set; }
        [StringLength(20)]
        public string? Modalidad { get; set; }
    }

    public class VehiculoResponseDto
    {
        public long IdVehiculo { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string? Foto { get; set; }
        public int IdUsuario { get; set; }
        public AutomovilResponseDto? Automovil { get; set; }
        public MotoResponseDto? Moto { get; set; }
    }

    public class AutomovilResponseDto
    {
        public short NumeroPuertas { get; set; }
    }

    public class MotoResponseDto
    {
        public string Modalidad { get; set; } = string.Empty;
    }
}
