using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class SolicitarCodigoRegistroDTO
{
    [Required, EmailAddress, StringLength(150)]
    public string Correo { get; set; } = string.Empty;
}

public class VerificarCodigoRegistroDTO
{
    [Required, EmailAddress, StringLength(150)]
    public string Correo { get; set; } = string.Empty;

    [Required, StringLength(4096, MinimumLength = 1)]
    public string Comprobante { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "El código debe tener exactamente 6 dígitos.")]
    public string Codigo { get; set; } = string.Empty;
}

public class VerificacionCorreoRegistroDTO
{
    [Required, StringLength(4096, MinimumLength = 1)]
    public string Comprobante { get; set; } = string.Empty;

    [Required, RegularExpression(@"^\d{6}$", ErrorMessage = "El código debe tener exactamente 6 dígitos.")]
    public string Codigo { get; set; } = string.Empty;
}
