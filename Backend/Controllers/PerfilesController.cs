using System.Text.RegularExpressions;
using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

/// <summary>
/// Perfil público de un usuario (conductor o pasajero que solicita un viaje).
/// Como el resto de la API, confía en el proxy de Next.js para saber quién
/// edita: el PUT solo debe llegar con el id del usuario de la sesión.
/// </summary>
[Route("api/perfiles")]
[ApiController]
public partial class PerfilesController(AppDbContext context) : ControllerBase
{
    /// <summary>Reseñas que se devuelven como máximo, las más recientes primero.</summary>
    public const int MaximoResenas = 20;

    /// <summary>Longitud máxima de la data URL (≈ 250 KB de imagen).</summary>
    public const int MaximoLongitudFoto = 350_000;

    [GeneratedRegex(@"^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$")]
    private static partial Regex FormatoFoto();

    [HttpGet("{idUsuario:int}")]
    public async Task<ActionResult<PerfilPublicoDto>> GetPerfil(int idUsuario)
    {
        var perfil = await context.Usuarios.AsNoTracking()
            .Where(u => u.IdPersonas == idUsuario)
            .Select(u => new PerfilPublicoDto
            {
                IdUsuario = u.IdPersonas,
                Nombre = (u.PrimerNombre ?? "") + " " + (u.PrimerApellido ?? ""),
                Ocupacion = u.ocupacion,
                Descripcion = u.Descripcion,
                FotoPerfil = u.FotoPerfil,
                MiembroDesde = u.fechaderegistro,
            })
            .FirstOrDefaultAsync();

        if (perfil is null)
            return NotFound();

        perfil.Nombre = perfil.Nombre.Trim();

        var puntuaciones = await context.Calificaciones.AsNoTracking()
            .Where(c => c.IdEvaluado == idUsuario)
            .Select(c => (int)c.Puntuacion)
            .ToListAsync();
        perfil.TotalCalificaciones = puntuaciones.Count;
        perfil.PromedioCalificacion = puntuaciones.Count == 0
            ? null
            : Math.Round(puntuaciones.Average(), 1);

        // Anónimas: sin evaluador ni reserva, que permitirían identificar a quien calificó.
        perfil.Resenas = await context.Calificaciones.AsNoTracking()
            .Where(c => c.IdEvaluado == idUsuario)
            .OrderByDescending(c => c.IdCalificacion)
            .Take(MaximoResenas)
            .Select(c => new ResenaPublicaDto(c.IdCalificacion, c.Puntuacion, c.Comentario))
            .ToListAsync();

        perfil.ViajesPublicados = await context.Viajes.CountAsync(v => v.IdUsuario == idUsuario);
        perfil.ViajesComoPasajero = await context.ReservasViaje
            .CountAsync(r => r.IdPasajero == idUsuario && r.Estado == "completada");

        perfil.Vehiculos = await context.Vehiculos.AsNoTracking()
            .Where(v => v.IdUsuario == idUsuario)
            .OrderBy(v => v.IdVehiculo)
            .Select(v => new VehiculoPublicoDto(v.Tipo, v.Modelo))
            .ToListAsync();

        return perfil;
    }

    [HttpPut("{idUsuario:int}")]
    public async Task<IActionResult> PutPerfil(int idUsuario, PerfilPublicoUpdateDto datos)
    {
        var usuario = await context.Usuarios.FindAsync(idUsuario);
        if (usuario is null)
            return NotFound();

        var foto = string.IsNullOrWhiteSpace(datos.FotoPerfil) ? null : datos.FotoPerfil.Trim();
        if (foto is not null && !EsFotoValida(foto))
            return BadRequest("La foto debe ser una imagen JPEG, PNG o WEBP de máximo 250 KB.");

        usuario.Descripcion = string.IsNullOrWhiteSpace(datos.Descripcion) ? null : datos.Descripcion.Trim();
        usuario.FotoPerfil = foto;
        await context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Acepta solo data URLs base64 de JPEG, PNG o WEBP cuyo contenido empiece
    /// con la firma del formato declarado (no SVG ni otros tipos con scripts).
    /// </summary>
    public static bool EsFotoValida(string foto)
    {
        if (foto.Length > MaximoLongitudFoto)
            return false;

        var coincidencia = FormatoFoto().Match(foto);
        if (!coincidencia.Success)
            return false;

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(coincidencia.Groups[2].Value);
        }
        catch (FormatException)
        {
            return false;
        }

        return coincidencia.Groups[1].Value switch
        {
            "jpeg" => bytes.Length > 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF,
            "png" => bytes.Length > 8 && bytes.AsSpan(0, 8).SequenceEqual(
                new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            "webp" => bytes.Length > 12
                && bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8)
                && bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false,
        };
    }
}
