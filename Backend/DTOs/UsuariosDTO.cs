namespace Backend.DTOs
{
    public class UsuariosDTO
    {
        public int IdPersonas { get; set; }
        public string PrimerNombre { get; set; }
        public string SegundoNombre { get; set; }
        public string PrimerApellido { get; set; }
        public string SegundoApellido { get; set; }
        public int Edad { get; set; }
        public string rol { get; set; }
        public string ocupacion { get; set; }
        public DateTime fechaderegistro { get; set; }


    }
    public class ListaUsuariosDTO
    {
        public int IdPersonas { get; set; }
        public string PrimerNombre { get; set; }
        public string SegundoNombre { get; set; }
        public string PrimerApellido { get; set; }
        public string SegundoApellido { get; set; }
        public int Edad { get; set; }
        public string ocupacion { get; set; }
        public string rol { get; set; }
        public DateTime fechaderegistro { get; set; } 





    }
    public class UsuariosCreateDTO
    {
        public string PrimerNombre { get; set; }
        public string SegundoNombre { get; set; }
        public string PrimerApellido { get; set; }
        public string SegundoApellido { get; set; }
        public int Edad { get; set; }
        public string Correo { get; set; }
        public string Contrasena { get; set; }
        public string rol { get; set; }
        public string ocupacion { get; set; }
    }
}
