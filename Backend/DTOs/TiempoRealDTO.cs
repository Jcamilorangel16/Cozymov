using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs
{
    // Lo que envía el servidor de Next.js tras verificar la sesión.
    public class TicketTiempoRealCreateDto
    {
        [Range(1, int.MaxValue)]
        public int IdUsuario { get; set; }
    }

    public class TicketTiempoRealDto
    {
        public string Ticket { get; set; } = null!;
        public int ExpiraEnSegundos { get; set; }
    }
}
