using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/vehiculos")]
[ApiController]
public class VehiculoesController(AppDbContext context) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vehiculo>>> GetVehiculos()
    {
        return await context.Vehiculos
            .Include(v => v.Automovil)
            .Include(v => v.Moto)
            .Include(v => v.Bicicleta)
            .ToListAsync();
    }

    [HttpGet("{idVehiculo:long}")]
    public async Task<ActionResult<Vehiculo>> GetVehiculo(long idVehiculo)
    {
        var vehiculo = await context.Vehiculos
            .Include(v => v.Automovil)
            .Include(v => v.Moto)
            .Include(v => v.Bicicleta)
            .FirstOrDefaultAsync(v => v.IdVehiculo == idVehiculo);

        return vehiculo is null ? NotFound() : vehiculo;
    }

    [HttpPost]
    public async Task<ActionResult<Vehiculo>> PostVehiculo(VehiculoCreateDto dto)
    {
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
        {
            return BadRequest($"El usuario {dto.IdUsuario} no existe.");
        }

        var vehiculo = new Vehiculo
        {
            Tipo = dto.Tipo,
            Modelo = dto.Modelo,
            Capacidad = dto.Capacidad,
            Foto = dto.Foto,
            IdUsuario = dto.IdUsuario
        };

        context.Vehiculos.Add(vehiculo);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetVehiculo), new { idVehiculo = vehiculo.IdVehiculo }, vehiculo);
    }

    [HttpPut("{idVehiculo:long}")]
    public async Task<IActionResult> PutVehiculo(long idVehiculo, VehiculoCreateDto dto)
    {
        var vehiculo = await context.Vehiculos.FindAsync(idVehiculo);
        if (vehiculo is null)
        {
            return NotFound();
        }

        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
        {
            return BadRequest($"El usuario {dto.IdUsuario} no existe.");
        }

        vehiculo.Tipo = dto.Tipo;
        vehiculo.Modelo = dto.Modelo;
        vehiculo.Capacidad = dto.Capacidad;
        vehiculo.Foto = dto.Foto;
        vehiculo.IdUsuario = dto.IdUsuario;

        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idVehiculo:long}")]
    public async Task<IActionResult> DeleteVehiculo(long idVehiculo)
    {
        var vehiculo = await context.Vehiculos.FindAsync(idVehiculo);
        if (vehiculo is null)
        {
            return NotFound();
        }

        context.Vehiculos.Remove(vehiculo);
        await context.SaveChangesAsync();
        return NoContent();
    }
}
