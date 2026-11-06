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
        public string UltimoMensaje { get; set; } = null!;
        public DateTime UltimaFecha { get; set; }
        public int NoLeidos { get; set; }
    }

    // Lo que recibe el POST
    public class MensajeCreateDTO
    {
        public int IdReceptor { get; set; }
        public string Contenido { get; set; } = null!;

        // TEMPORAL: quitar cuando exista login
        public int IdEmisor { get; set; }
    }
}
