using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/rutas")]
[ApiController]
public class RutasController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<RutaDto>>> GetRutas()
    {
        return await context.Rutas
            .Select(r => new RutaDto
            {
                IdRuta = r.IdRuta,
                Origen = r.Origen,
                Destino = r.Destino,
                LatOrigen = r.LatOrigen,
                LonOrigen = r.LonOrigen,
                LatDestino = r.LatDestino,
                LonDestino = r.LonDestino
            })
            .ToListAsync();
    }

    [HttpGet("{idRuta:long}")]
    public async Task<ActionResult<RutaDto>> GetRuta(long idRuta)
    {
        var ruta = await context.Rutas
            .Where(r => r.IdRuta == idRuta)
            .Select(r => new RutaDto
            {
                IdRuta = r.IdRuta,
                Origen = r.Origen,
                Destino = r.Destino,
                LatOrigen = r.LatOrigen,
                LonOrigen = r.LonOrigen,
                LatDestino = r.LatDestino,
                LonDestino = r.LonDestino
            })
            .FirstOrDefaultAsync();

        return ruta is null ? NotFound() : ruta;
    }

    [HttpPost]
    public async Task<ActionResult<RutaDto>> PostRuta(RutaCreateDto dto)
    {
        var ruta = new Ruta
        {
            Origen = dto.Origen,
            Destino = dto.Destino,
            LatOrigen = dto.LatOrigen,
            LonOrigen = dto.LonOrigen,
            LatDestino = dto.LatDestino,
            LonDestino = dto.LonDestino
        };

        context.Rutas.Add(ruta);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRuta), new { idRuta = ruta.IdRuta }, ToDto(ruta));
    }

    [HttpPut("{idRuta:long}")]
    public async Task<IActionResult> PutRuta(long idRuta, RutaCreateDto dto)
    {
        var ruta = await context.Rutas.FindAsync(idRuta);
        if (ruta is null)
        {
            return NotFound();
        }

        ruta.Origen = dto.Origen;
        ruta.Destino = dto.Destino;
        ruta.LatOrigen = dto.LatOrigen;
        ruta.LonOrigen = dto.LonOrigen;
        ruta.LatDestino = dto.LatDestino;
        ruta.LonDestino = dto.LonDestino;

        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idRuta:long}")]
    public async Task<IActionResult> DeleteRuta(long idRuta)
    {
        var ruta = await context.Rutas.FindAsync(idRuta);
        if (ruta is null)
        {
            return NotFound();
        }

        context.Rutas.Remove(ruta);
        try
        {
            await context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            return Conflict("No se puede eliminar la ruta porque tiene viajes asociados.");
        }

        return NoContent();
    }

    private static RutaDto ToDto(Ruta ruta) => new()
    {
        IdRuta = ruta.IdRuta,
        Origen = ruta.Origen,
        Destino = ruta.Destino,
        LatOrigen = ruta.LatOrigen,
        LonOrigen = ruta.LonOrigen,
        LatDestino = ruta.LatDestino,
        LonDestino = ruta.LonDestino
    };
}
