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

        public ICollection<Vehiculo> Vehiculos { get; set; } = new List<Vehiculo>();
        public ICollection<Viaje> Viajes { get; set; } = new List<Viaje>();


    }
}
