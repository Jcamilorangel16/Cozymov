using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/bicicletas-electricas")]
[ApiController]
public class BicicletasController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Bicicleta>>> GetBicicletas()
    {
        return await context.Bicicletas.Include(b => b.Vehiculo).ToListAsync();
    }

    [HttpGet("{idVehiculo:long}")]
    public async Task<ActionResult<Bicicleta>> GetBicicleta(long idVehiculo)
    {
        var bicicleta = await context.Bicicletas
            .Include(b => b.Vehiculo)
            .FirstOrDefaultAsync(b => b.IdVehiculo == idVehiculo);

        return bicicleta is null ? NotFound() : bicicleta;
    }

    [HttpPost("{idVehiculo:long}")]
    public async Task<ActionResult<Bicicleta>> PostBicicleta(long idVehiculo)
    {
        if (!await context.Vehiculos.AnyAsync(v => v.IdVehiculo == idVehiculo))
        {
            return NotFound("El vehículo base no existe.");
        }

        if (await context.Bicicletas.AnyAsync(b => b.IdVehiculo == idVehiculo))
        {
            return Conflict("El vehículo ya tiene una bicicleta eléctrica asociada.");
        }

        var bicicleta = new Bicicleta { IdVehiculo = idVehiculo };
        context.Bicicletas.Add(bicicleta);
        await context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetBicicleta), new { idVehiculo }, bicicleta);
    }

    [HttpDelete("{idVehiculo:long}")]
    public async Task<IActionResult> DeleteBicicleta(long idVehiculo)
    {
        var bicicleta = await context.Bicicletas.FindAsync(idVehiculo);
        if (bicicleta is null)
        {
            return NotFound();
        }

        context.Bicicletas.Remove(bicicleta);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
