using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    public class VehiculoDto
    {
        public string Tipo { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public int IdUsuario { get; set; }
    }

    /// <summary>
    /// Registro de un vehículo (multipart/form-data). Todo es opcional a nivel de
    /// binding: la obligatoriedad depende del tipo y la valida VehiculoRegistroService.
    /// </summary>
    public class VehiculoCreateDto
    {
        public int? IdUsuario { get; set; }
        public string? Tipo { get; set; }
        public string? Marca { get; set; }
        public string? Modelo { get; set; }
        public int? Capacidad { get; set; }
        public IFormFile? FotoFrontal { get; set; }
        public IFormFile? FotoLateral { get; set; }
        public IFormFile? FotoPerfil { get; set; }

        // Automóvil
        public short? NumeroPuertas { get; set; }

        // Moto
        public string? Modalidad { get; set; }

        // Automóvil y moto
        public IFormFile? FotoPlaca { get; set; }
        public IFormFile? FotoLicencia { get; set; }
        public IFormFile? DocTecnomecanica { get; set; }
        public IFormFile? DocSoat { get; set; }

        // Bicicleta eléctrica
        public string? NumeroSerie { get; set; }
        public decimal? VelocidadMaxima { get; set; }
        public decimal? CapacidadPeso { get; set; }
        public bool? CapacidadVehicular { get; set; }
        public bool? Casco { get; set; }
        public bool? Chaleco { get; set; }
        public bool? Luces { get; set; }
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
        [Range(2, 5)]
        public short? NumeroPuertas { get; set; }
        [StringLength(20)]
        public string? Modalidad { get; set; }
    }

    public class VehiculoResponseDto
    {
        public long IdVehiculo { get; set; }
        public string Tipo { get; set; } = string.Empty;
        public string? Marca { get; set; }
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string? FotoFrontal { get; set; }
        public string? FotoLateral { get; set; }
        public string? FotoPerfil { get; set; }
        public int IdUsuario { get; set; }
        public AutomovilResponseDto? Automovil { get; set; }
        public MotoResponseDto? Moto { get; set; }
        public BicicletaElectricaResponseDto? BicicletaElectrica { get; set; }
    }

    public class AutomovilResponseDto
    {
        public short NumeroPuertas { get; set; }
        public string? FotoPlaca { get; set; }
        public string? FotoLicencia { get; set; }
        public string? DocTecnomecanica { get; set; }
        public string? DocSoat { get; set; }
    }

    public class MotoResponseDto
    {
        public string Modalidad { get; set; } = string.Empty;
        public string? FotoPlaca { get; set; }
        public string? FotoLicencia { get; set; }
        public string? DocTecnomecanica { get; set; }
        public string? DocSoat { get; set; }
    }

    public class BicicletaElectricaResponseDto
    {
        public string? NumeroSerie { get; set; }
        public decimal? VelocidadMaxima { get; set; }
        public decimal? CapacidadPeso { get; set; }
        public bool CapacidadVehicular { get; set; }
        public bool Casco { get; set; }
        public bool Chaleco { get; set; }
        public bool Luces { get; set; }
    }
}
