using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    
    public class MensajeDTO
    {
        public int IdMensaje { get; set; }
        public int IdEmisor { get; set; }
        public int IdReceptor { get; set; }
        public string Contenido { get; set; } = null!;
        public DateTime FechaHora { get; set; }
        public bool Leido { get; set; }
    }

    // Un chat en la lista (con quién hablo, último mensaje y no leídos)
    public class MensajeListaDTO
    {
        public int Otro { get; set; }
        public string OtroNombre { get; set; } = null!;
        public string UltimoMensaje { get; set; } = null!;
        public DateTime UltimaFecha { get; set; }
        public int NoLeidos { get; set; }
    }

    public class MensajeContactoDTO
    {
        public int IdPersonas { get; set; }
        public string Nombre { get; set; } = null!;
        public string Ocupacion { get; set; } = null!;
    }

    // Lo que recibe el POST
    public class MensajeCreateDTO
    {
        [Range(1, int.MaxValue)]
        public int IdReceptor { get; set; }
        [Required, StringLength(500)]
        public string Contenido { get; set; } = null!;

        // TEMPORAL: quitar cuando exista login
        [Range(1, int.MaxValue)]
        public int IdEmisor { get; set; }
    }
}
