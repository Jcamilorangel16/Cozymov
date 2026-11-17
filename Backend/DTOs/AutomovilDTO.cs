using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class AutomovilDto
{
    [Range(2, 5)]
    public short NumeroPuertas { get; set; }
}
