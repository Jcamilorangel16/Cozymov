using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Mensaje
    {
        [Key] public int IdMensaje { get; set; }
        public int IdEmisor { get; set; }
        public int IdReceptor { get; set; }
        public string Contenido { get; set; } = null!;
        public DateTime FechaHora { get; set; }
        public bool Leido { get; set; }

        public Usuarios Emisor { get; set; } = null!;
        public Usuarios Receptor { get; set; } = null!;
    }
}
