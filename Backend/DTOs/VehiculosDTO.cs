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
        public string Tipo { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string? Foto { get; set; }
        public int IdUsuario { get; set; }
    }

    /// <summary>
    /// Edición de un vehículo. No incluye IdUsuario: la propiedad no se puede reasignar.
    /// </summary>
    public class VehiculoUpdateDto
    {
        public string Tipo { get; set; } = string.Empty;
        public string Modelo { get; set; } = string.Empty;
        public int Capacidad { get; set; }
        public string? Foto { get; set; }
        public short? NumeroPuertas { get; set; }
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
