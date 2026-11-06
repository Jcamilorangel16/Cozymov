using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VerificacionCorreo
    {
        [Key]
        public string Correo { get; set; } = string.Empty;
        public string? CodigoHash { get; set; }
        public DateTime ExpiraEn { get; set; }
        public DateTime? VerificadoEn { get; set; }
        public int IntentosFallidos { get; set; }
    }
}
