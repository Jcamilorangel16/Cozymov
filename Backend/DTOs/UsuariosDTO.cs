namespace Backend.DTOs
{
    public class UsuariosDTO
    {
        public int IdPersonas { get; set; }
        public string Cedula { get; set; }
        public string PrimerNombre { get; set; }
        public string SegundoNombre { get; set; }
        public string PrimerApellido { get; set; }
        public string SegundoApellido { get; set; }
        public int Edad { get; set; }
        public string Correo { get; set; }
        public string rol { get; set; }
        public string ocupacion { get; set; }
        public DateTime fechaderegistro { get; set; }


    }
    public class ListaUsuariosDTO
    {
        public int IdPersonas { get; set; }
        public string Cedula { get; set; }
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

        public VerificacionCorreoRegistroDTO? Verificacion { get; set; }
    }
}

public class UsuariosUpdateDTO
{
    public string Cedula { get; set; }
    public string PrimerNombre { get; set; }
    public string SegundoNombre { get; set; }
    public string PrimerApellido { get; set; }
    public string SegundoApellido { get; set; }
    public int Edad { get; set; }
    public string Correo { get; set; }
    public string ocupacion { get; set; }
}


public class CambiarContrasenaDTO
{
    public string ContrasenaActual { get; set; } = string.Empty;
    public string NuevaContrasena { get; set; } = string.Empty;
}

public class UsuariosLoginDTO
{
    public string Correo { get; set; }
    public string Contrasena { get; set; }
}

/// <summary>
/// Identidad de Google ya validada por el servidor de Next.js.
/// </summary>
public class UsuariosLoginGoogleDTO
{
    public string Sub { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public bool EmailVerificado { get; set; }
}
