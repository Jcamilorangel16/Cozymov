using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class SolicitarRecuperacionDTO
{
    [Required, StringLength(150)]
    public string Correo { get; set; } = string.Empty;
}

public class RestablecerContrasenaDTO
{
    [Required, StringLength(150)]
    public string Correo { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "El código debe tener exactamente 6 dígitos.")]
    public string Codigo { get; set; } = string.Empty;

    [Required, StringLength(200)]
    public string NuevaContrasena { get; set; } = string.Empty;
}
