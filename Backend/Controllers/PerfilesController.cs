using Backend.Data;
using Backend.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

/// <summary>
/// Perfil público (solo lectura) de un usuario: conductor de un viaje o pasajero
/// que solicita uno. Solo lee columnas existentes del esquema.
/// </summary>
[Route("api/perfiles")]
[ApiController]
public class PerfilesController(AppDbContext context) : ControllerBase
{
    /// <summary>Reseñas que se devuelven como máximo, las más recientes primero.</summary>
    public const int MaximoResenas = 20;

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
}
