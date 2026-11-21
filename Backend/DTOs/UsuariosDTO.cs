using System.ComponentModel.DataAnnotations;

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
        [Required, RegularExpression(@"^\d{1,10}$", ErrorMessage = "La cédula debe contener solo números y máximo 10 dígitos.")]
        public string Cedula { get; set; }
        [StringLength(50)]
        public string PrimerNombre { get; set; }
        [StringLength(50)]
        public string SegundoNombre { get; set; }
        [StringLength(50)]
        public string PrimerApellido { get; set; }
        [StringLength(50)]
        public string SegundoApellido { get; set; }
        [Range(16, 120)]
        public int Edad { get; set; }
        [StringLength(150)]
        public string Correo { get; set; }
        [StringLength(200)]
        public string Contrasena { get; set; }
        [StringLength(20)]
        public string rol { get; set; }
        [StringLength(50)]
        public string ocupacion { get; set; }
        /// <summary>Celular obligatorio; se guarda en telefono_usuario para recuperar la contraseña.</summary>
        [StringLength(20)]
        public string? Telefono { get; set; }
    }
}

public class UsuariosUpdateDTO
{
    [Required, RegularExpression(@"^\d{1,10}$", ErrorMessage = "La cédula debe contener solo números y máximo 10 dígitos.")]
    public string Cedula { get; set; }
    [StringLength(50)]
    public string PrimerNombre { get; set; }
    [StringLength(50)]
    public string SegundoNombre { get; set; }
    [StringLength(50)]
    public string PrimerApellido { get; set; }
    [StringLength(50)]
    public string SegundoApellido { get; set; }
    [Range(1, 120)]
    public int Edad { get; set; }
    [StringLength(150)]
    public string Correo { get; set; }
    [StringLength(50)]
    public string ocupacion { get; set; }
}


public class CambiarContrasenaDTO
{
    [StringLength(200)]
    public string ContrasenaActual { get; set; } = string.Empty;
    [StringLength(200)]
    public string NuevaContrasena { get; set; } = string.Empty;
}

public class UsuariosLoginDTO
{
    [StringLength(150)]
    public string Correo { get; set; }
    [StringLength(200)]
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

/// <summary>
/// Identidad de Microsoft Entra ID ya validada por el servidor de Next.js
/// (tenant de la universidad, cuenta miembro). Sub es "tid:oid".
/// </summary>
public class UsuariosLoginMicrosoftDTO
{
    public string Sub { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
}

/// <summary>
/// Cuenta nueva a partir de una identidad de Google ya validada por el servidor
/// de Next.js. Sub, correo y verificación vienen de Google; el resto, incluida
/// la contraseña, lo completa el usuario.
/// </summary>
public class UsuariosRegistroGoogleDTO : UsuariosRegistroExternoDTO
{
    public bool EmailVerificado { get; set; }
}

/// <summary>
/// Cuenta nueva a partir de una identidad de Microsoft ya validada por el
/// servidor de Next.js (tenant de la universidad, cuenta miembro). Sub es
/// "tid:oid"; el resto lo completa el usuario.
/// </summary>
public class UsuariosRegistroMicrosoftDTO : UsuariosRegistroExternoDTO
{
}

/// <summary>Datos comunes del registro con un proveedor externo.</summary>
public abstract class UsuariosRegistroExternoDTO
{
    [StringLength(255)]
    public string Sub { get; set; } = string.Empty;
    [StringLength(150)]
    public string Correo { get; set; } = string.Empty;
    [Required, RegularExpression(@"^\d{1,10}$", ErrorMessage = "La cédula debe contener solo números y máximo 10 dígitos.")]
    public string Cedula { get; set; } = string.Empty;
    [Required, StringLength(50)]
    public string PrimerNombre { get; set; } = string.Empty;
    [StringLength(50)]
    public string? SegundoNombre { get; set; }
    [Required, StringLength(50)]
    public string PrimerApellido { get; set; } = string.Empty;
    [StringLength(50)]
    public string? SegundoApellido { get; set; }
    [Range(16, 120)]
    public int Edad { get; set; }
    [Required, StringLength(50)]
    public string Ocupacion { get; set; } = string.Empty;
    /// <summary>Celular obligatorio; se guarda en telefono_usuario para recuperar la contraseña.</summary>
    [StringLength(20)]
    public string? Telefono { get; set; }
    [Required, StringLength(200)]
    public string Contrasena { get; set; } = string.Empty;
}
