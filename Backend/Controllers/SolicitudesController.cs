using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/solicitudes")]
[ApiController]
public class SolicitudesController(AppDbContext context) : ControllerBase
{
    // GET: api/solicitudes?idUsuario=1&idRuta=2&compartir=true
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SolicitudDto>>> GetSolicitudes(
        [FromQuery] int? idUsuario,
        [FromQuery] long? idRuta,
        [FromQuery] bool? compartir)
    {
        var consulta = context.Solicitudes.AsNoTracking();
        if (idUsuario is not null) consulta = consulta.Where(s => s.IdUsuario == idUsuario);
        if (idRuta is not null) consulta = consulta.Where(s => s.IdRuta == idRuta);
        if (compartir is not null) consulta = consulta.Where(s => s.Compartir == compartir);

        return await consulta
            .OrderByDescending(s => s.FechaHora)
            .Select(s => new SolicitudDto
            {
                IdSolicitud = s.IdSolicitud,
                IdUsuario = s.IdUsuario,
                IdRuta = s.IdRuta,
                FechaHora = s.FechaHora,
                HoraLimite = s.HoraLimite,
                Presupuesto = s.Presupuesto,
                Compartir = s.Compartir
            })
            .ToListAsync();
    }

    [HttpGet("{idSolicitud:long}")]
    public async Task<ActionResult<SolicitudDto>> GetSolicitud(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.AsNoTracking()
            .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud);
        return solicitud is null ? NotFound() : ToDto(solicitud);
    }

    // Viajes que coinciden con la solicitud: misma ruta, salida el mismo día,
    // con cupos y dentro del presupuesto (y antes de la hora límite si existe).
    [HttpGet("{idSolicitud:long}/coincidencias")]
    public async Task<ActionResult<IEnumerable<ViajeCoincidenciaDto>>> GetCoincidencias(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.AsNoTracking()
            .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud);
        if (solicitud is null)
            return NotFound();

        var dia = solicitud.FechaHora.Date;
        var siguiente = dia.AddDays(1);
        var presupuesto = solicitud.Presupuesto;

        var viajes = await context.Viajes.AsNoTracking()
            .Where(v => v.IdRuta == solicitud.IdRuta
                && v.CuposDisponibles > 0
                && v.FechaHoraSalida >= dia && v.FechaHoraSalida < siguiente
                && (presupuesto == null || v.Costo <= presupuesto)
                && v.Estado.ToLower() != "cancelado" && v.Estado.ToLower() != "finalizado")
            .OrderBy(v => v.FechaHoraSalida)
            .Select(v => new ViajeCoincidenciaDto
            {
                IdViaje = v.IdViaje,
                FechaHoraSalida = v.FechaHoraSalida,
                Costo = v.Costo,
                CuposDisponibles = v.CuposDisponibles,
                Estado = v.Estado
            })
            .ToListAsync();

        if (solicitud.HoraLimite is { } limite)
            viajes = viajes.Where(v => TimeOnly.FromDateTime(v.FechaHoraSalida) <= limite).ToList();

        return viajes;
    }

    [HttpPost]
    public async Task<ActionResult<SolicitudDto>> PostSolicitud(SolicitudCreateDto dto)
    {
        var error = await ValidarReferencias(dto);
        if (error is not null)
            return error;

        var solicitud = new Solicitud();
        Aplicar(solicitud, dto);
        context.Solicitudes.Add(solicitud);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSolicitud), new { idSolicitud = solicitud.IdSolicitud }, ToDto(solicitud));
    }

    [HttpPut("{idSolicitud:long}")]
    public async Task<IActionResult> PutSolicitud(long idSolicitud, SolicitudCreateDto dto)
    {
        var solicitud = await context.Solicitudes.FindAsync(idSolicitud);
        if (solicitud is null)
            return NotFound();

        if (solicitud.IdUsuario != dto.IdUsuario)
            return BadRequest("No se puede cambiar el usuario de la solicitud.");

        var error = await ValidarReferencias(dto);
        if (error is not null)
            return error;

        Aplicar(solicitud, dto);
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idSolicitud:long}")]
    public async Task<IActionResult> DeleteSolicitud(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.FindAsync(idSolicitud);
        if (solicitud is null)
            return NotFound();

        context.Solicitudes.Remove(solicitud);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private async Task<BadRequestObjectResult?> ValidarReferencias(SolicitudCreateDto dto)
    {
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
            return BadRequest("El usuario no existe.");
        if (!await context.Rutas.AnyAsync(r => r.IdRuta == dto.IdRuta))
            return BadRequest("La ruta no existe.");
        return null;
    }

    private static void Aplicar(Solicitud solicitud, SolicitudCreateDto dto)
    {
        solicitud.IdUsuario = dto.IdUsuario;
        solicitud.IdRuta = dto.IdRuta;
        solicitud.FechaHora = DateTime.SpecifyKind(dto.FechaHora, DateTimeKind.Unspecified);
        solicitud.HoraLimite = dto.HoraLimite;
        solicitud.Presupuesto = dto.Presupuesto;
        solicitud.Compartir = dto.Compartir;
    }

    private static SolicitudDto ToDto(Solicitud s) => new()
    {
        IdSolicitud = s.IdSolicitud,
        IdUsuario = s.IdUsuario,
        IdRuta = s.IdRuta,
        FechaHora = s.FechaHora,
        HoraLimite = s.HoraLimite,
        Presupuesto = s.Presupuesto,
        Compartir = s.Compartir
    };
}
