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

    [Required, StringLength(6, MinimumLength = 6)]
    public string Codigo { get; set; } = string.Empty;
}
