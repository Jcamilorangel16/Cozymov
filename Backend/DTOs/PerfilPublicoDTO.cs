using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

/// <summary>
/// Datos de un usuario que cualquier persona autenticada puede ver: nunca incluye
/// cédula, correo, teléfonos, edad ni quién escribió cada reseña.
/// </summary>
public sealed class PerfilPublicoDto
{
    public int IdUsuario { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Ocupacion { get; set; }
    public string? Descripcion { get; set; }
    public string? FotoPerfil { get; set; }
    public DateTime MiembroDesde { get; set; }
    public double? PromedioCalificacion { get; set; }
    public int TotalCalificaciones { get; set; }
    public int ViajesPublicados { get; set; }
    public int ViajesComoPasajero { get; set; }
    public List<VehiculoPublicoDto> Vehiculos { get; set; } = [];
    /// <summary>Reseñas recibidas más recientes, anónimas.</summary>
    public List<ResenaPublicaDto> Resenas { get; set; } = [];
}

public sealed record VehiculoPublicoDto(string Tipo, string Modelo);

public sealed record ResenaPublicaDto(long IdCalificacion, short Puntuacion, string? Comentario);

/// <summary>Campos del perfil público que el propio usuario puede editar.</summary>
public sealed class PerfilPublicoUpdateDto
{
    [StringLength(160)]
    public string? Descripcion { get; set; }

    /// <summary>Data URL de una imagen JPEG, PNG o WEBP; null quita la foto.</summary>
    public string? FotoPerfil { get; set; }
}
