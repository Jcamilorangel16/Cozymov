using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/motos")]
[ApiController]
public class MotoesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Moto>>> GetMotos()
    {
        return await context.Motos.ToListAsync();
    }

    [HttpGet("{idVehiculo:long}")]
    public async Task<ActionResult<Moto>> GetMoto(long idVehiculo)
    {
        var moto = await context.Motos
            .FirstOrDefaultAsync(m => m.IdVehiculo == idVehiculo);

        return moto is null ? NotFound() : moto;
    }

    [HttpPost("{idVehiculo:long}")]
    public async Task<ActionResult<Moto>> PostMoto(long idVehiculo, MotoDto dto)
    {
        if (!await context.Vehiculos.AnyAsync(v => v.IdVehiculo == idVehiculo))
        {
            return NotFound("El vehículo base no existe.");
        }

        if (await context.Motos.AnyAsync(m => m.IdVehiculo == idVehiculo))
        {
            return Conflict("El vehículo ya tiene una moto asociada.");
        }

        var moto = new Moto { IdVehiculo = idVehiculo, Modalidad = dto.Modalidad };
        context.Motos.Add(moto);
        await context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetMoto), new { idVehiculo }, moto);
    }

    [HttpPut("{idVehiculo:long}")]
    public async Task<IActionResult> PutMoto(long idVehiculo, MotoDto dto)
    {
        var moto = await context.Motos.FindAsync(idVehiculo);
        if (moto is null)
        {
            return NotFound();
        }

        moto.Modalidad = dto.Modalidad;
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idVehiculo:long}")]
    public async Task<IActionResult> DeleteMoto(long idVehiculo)
    {
        var moto = await context.Motos.FindAsync(idVehiculo);
        if (moto is null)
        {
            return NotFound();
        }

        context.Motos.Remove(moto);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
