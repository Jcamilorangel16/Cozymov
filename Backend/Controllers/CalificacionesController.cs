using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/calificaciones")]
[ApiController]
public class CalificacionesController(AppDbContext context) : ControllerBase
{
    // GET: api/calificaciones?idReserva=1&idEvaluado=2&idEvaluador=3
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CalificacionDto>>> GetCalificaciones(
        [FromQuery] long? idReserva,
        [FromQuery] int? idEvaluado,
        [FromQuery] int? idEvaluador)
    {
        var consulta = context.Calificaciones.AsNoTracking();
        if (idReserva is not null) consulta = consulta.Where(c => c.IdReserva == idReserva);
        if (idEvaluado is not null) consulta = consulta.Where(c => c.IdEvaluado == idEvaluado);
        if (idEvaluador is not null) consulta = consulta.Where(c => c.IdEvaluador == idEvaluador);

        return await consulta
            .OrderByDescending(c => c.IdCalificacion)
            .Select(c => new CalificacionDto
            {
                IdCalificacion = c.IdCalificacion,
                IdReserva = c.IdReserva,
                IdEvaluador = c.IdEvaluador,
                IdEvaluado = c.IdEvaluado,
                Puntuacion = c.Puntuacion,
                Comentario = c.Comentario
            })
            .ToListAsync();
    }

    [HttpGet("{idCalificacion:long}")]
    public async Task<ActionResult<CalificacionDto>> GetCalificacion(long idCalificacion)
    {
        var calificacion = await context.Calificaciones.AsNoTracking()
            .FirstOrDefaultAsync(c => c.IdCalificacion == idCalificacion);
        return calificacion is null ? NotFound() : ToDto(calificacion);
    }

    // Promedio y total de valoraciones recibidas por un usuario.
    [HttpGet("resumen/{idEvaluado:int}")]
    public async Task<ActionResult<CalificacionResumenDto>> GetResumen(int idEvaluado)
    {
        var puntuaciones = await context.Calificaciones.AsNoTracking()
            .Where(c => c.IdEvaluado == idEvaluado)
            .Select(c => (int)c.Puntuacion)
            .ToListAsync();

        return new CalificacionResumenDto
        {
            IdEvaluado = idEvaluado,
            Total = puntuaciones.Count,
            Promedio = puntuaciones.Count == 0 ? null : Math.Round(puntuaciones.Average(), 2)
        };
    }

    [HttpPost]
    public async Task<ActionResult<CalificacionDto>> PostCalificacion(CalificacionCreateDto dto)
    {
        // La valoración exige una experiencia de viaje registrada (reserva).
        var reserva = await context.ReservasViaje.AsNoTracking()
            .Include(r => r.Viaje)
            .FirstOrDefaultAsync(r => r.IdReserva == dto.IdReserva);
        if (reserva is null)
            return BadRequest("La reserva no existe.");

        if (reserva.Estado != "completada")
            return BadRequest("Solo se puede calificar una reserva de un viaje finalizado.");

        if (dto.IdEvaluador == dto.IdEvaluado)
            return BadRequest("Un usuario no puede valorarse a sí mismo.");

        var participantes = new[] { reserva.IdPasajero, reserva.Viaje.IdUsuario };
        if (!participantes.Contains(dto.IdEvaluador) || !participantes.Contains(dto.IdEvaluado))
            return BadRequest("Evaluador y evaluado deben ser el pasajero y el conductor de la reserva.");

        if (await context.Calificaciones.AnyAsync(c =>
                c.IdReserva == dto.IdReserva && c.IdEvaluador == dto.IdEvaluador))
            return Conflict("El evaluador ya valoró esta reserva.");

        var calificacion = new Calificacion
        {
            IdReserva = dto.IdReserva,
            IdEvaluador = dto.IdEvaluador,
            IdEvaluado = dto.IdEvaluado,
            Puntuacion = dto.Puntuacion,
            Comentario = string.IsNullOrWhiteSpace(dto.Comentario) ? null : dto.Comentario.Trim()
        };

        context.Calificaciones.Add(calificacion);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCalificacion),
            new { idCalificacion = calificacion.IdCalificacion }, ToDto(calificacion));
    }

    [HttpDelete("{idCalificacion:long}")]
    public async Task<IActionResult> DeleteCalificacion(long idCalificacion)
    {
        var calificacion = await context.Calificaciones.FindAsync(idCalificacion);
        if (calificacion is null)
            return NotFound();

        context.Calificaciones.Remove(calificacion);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private static CalificacionDto ToDto(Calificacion c) => new()
    {
        IdCalificacion = c.IdCalificacion,
        IdReserva = c.IdReserva,
        IdEvaluador = c.IdEvaluador,
        IdEvaluado = c.IdEvaluado,
        Puntuacion = c.Puntuacion,
        Comentario = c.Comentario
    };
}
