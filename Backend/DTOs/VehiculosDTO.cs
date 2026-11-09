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
}
