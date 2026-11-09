using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/automoviles")]
[ApiController]
public class AutomovilsController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Automovil>>> GetAutomoviles()
    {
        return await context.Automoviles.Include(a => a.Vehiculo).ToListAsync();
    }

    [HttpGet("{idVehiculo:long}")]
    public async Task<ActionResult<Automovil>> GetAutomovil(long idVehiculo)
    {
        var automovil = await context.Automoviles
            .Include(a => a.Vehiculo)
            .FirstOrDefaultAsync(a => a.IdVehiculo == idVehiculo);

        return automovil is null ? NotFound() : automovil;
    }

    [HttpPost("{idVehiculo:long}")]
    public async Task<ActionResult<Automovil>> PostAutomovil(long idVehiculo, AutomovilDto dto)
    {
        if (!await context.Vehiculos.AnyAsync(v => v.IdVehiculo == idVehiculo))
        {
            return NotFound("El vehículo base no existe.");
        }

        if (await context.Automoviles.AnyAsync(a => a.IdVehiculo == idVehiculo))
        {
            return Conflict("El vehículo ya tiene un automóvil asociado.");
        }

        var automovil = new Automovil
        {
            IdVehiculo = idVehiculo,
            NumeroPuertas = dto.NumeroPuertas
        };

        context.Automoviles.Add(automovil);
        await context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAutomovil), new { idVehiculo }, automovil);
    }

    [HttpPut("{idVehiculo:long}")]
    public async Task<IActionResult> PutAutomovil(long idVehiculo, AutomovilDto dto)
    {
        var automovil = await context.Automoviles.FindAsync(idVehiculo);
        if (automovil is null)
        {
            return NotFound();
        }

        automovil.NumeroPuertas = dto.NumeroPuertas;
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idVehiculo:long}")]
    public async Task<IActionResult> DeleteAutomovil(long idVehiculo)
    {
        var automovil = await context.Automoviles.FindAsync(idVehiculo);
        if (automovil is null)
        {
            return NotFound();
        }

        context.Automoviles.Remove(automovil);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
