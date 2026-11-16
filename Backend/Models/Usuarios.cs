using Microsoft.EntityFrameworkCore.Metadata.Internal;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Usuarios
    {
        [Key]
        public int IdPersonas { get; set; }
        public string Cedula { get; set; }
        public string PrimerNombre { get; set; }
        public string SegundoNombre { get; set; }
        public string PrimerApellido { get; set; }
        public string SegundoApellido { get; set; }
        public int Edad { get; set; }
        public string Correo { get; set; }
        public string Contrasena { get; set; }
        public string rol { get; set; }
        public string ocupacion { get; set; }
        public DateTime fechaderegistro { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Indica si el usuario confirmó su correo. Las cuentas creadas antes
        /// de esta verificación se consideran confirmadas para no bloquearlas.
        /// </summary>
        public bool EmailVerificado { get; set; } = true;

        /// <summary>HMAC del código vigente de recuperación (nunca el código en claro).</summary>
        public string? CodigoRecuperacionHash { get; set; }
        public DateTime? CodigoRecuperacionVence { get; set; }
        public int CodigoRecuperacionIntentos { get; set; }
        public DateTime? CodigoRecuperacionEnviado { get; set; }

        public ICollection<Vehiculo> Vehiculos { get; set; } = new List<Vehiculo>();
        public ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();
        public ICollection<TelefonoUsuario> Telefonos { get; set; } = new List<TelefonoUsuario>();
        public Preferencia? Preferencia { get; set; }
        public ICollection<Solicitud> Solicitudes { get; set; } = new List<Solicitud>();
        public ICollection<Calificacion> CalificacionesEmitidas { get; set; } = new List<Calificacion>();
        public ICollection<Calificacion> CalificacionesRecibidas { get; set; } = new List<Calificacion>();

    }
}
