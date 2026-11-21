using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

/// <summary>Pide un código por correo. Proposito: "registro" o "recuperacion".</summary>
public class EnviarCodigoDTO
{
    [StringLength(200)]
    public string Correo { get; set; } = string.Empty;
    [StringLength(20)]
    public string Proposito { get; set; } = string.Empty;
}

/// <summary>Confirma el código del registro.</summary>
public class VerificarCodigoDTO
{
    [StringLength(200)]
    public string Correo { get; set; } = string.Empty;
    [StringLength(10)]
    public string Codigo { get; set; } = string.Empty;
}

/// <summary>Restablece la contraseña con el código de recuperación.</summary>
public class RestablecerContrasenaDTO
{
    [StringLength(200)]
    public string Correo { get; set; } = string.Empty;
    [StringLength(10)]
    public string Codigo { get; set; } = string.Empty;
    [StringLength(200)]
    public string NuevaContrasena { get; set; } = string.Empty;
}
