using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class PreferenciaDto
{
    public int IdUsuario { get; set; }
    public short? PrioridadCosto { get; set; }
    public short? PrioridadTiempo { get; set; }
    public bool? PreferirCompartir { get; set; }
}

public class PreferenciaUpsertDto
{
    [Range(1, 5)]
    public short? PrioridadCosto { get; set; }

    [Range(1, 5)]
    public short? PrioridadTiempo { get; set; }

    public bool? PreferirCompartir { get; set; }
}
