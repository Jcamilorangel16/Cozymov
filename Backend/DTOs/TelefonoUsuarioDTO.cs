using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class TelefonoUsuarioDto
{
    public long IdTelefono { get; set; }
    public int IdUsuario { get; set; }
    public string Telefono { get; set; } = string.Empty;
}

public class TelefonoUsuarioCreateDto
{
    [Range(1, int.MaxValue)]
    public int IdUsuario { get; set; }

    [Required, StringLength(20, MinimumLength = 7)]
    [RegularExpression(@"^\+?[0-9 ]+$", ErrorMessage = "El teléfono solo admite dígitos, espacios y un signo + inicial.")]
    public string Telefono { get; set; } = string.Empty;
}
