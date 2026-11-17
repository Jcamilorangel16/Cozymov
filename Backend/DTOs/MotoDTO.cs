using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class MotoDto
{
    [Required, StringLength(20)]
    public string Modalidad { get; set; } = string.Empty;
}
