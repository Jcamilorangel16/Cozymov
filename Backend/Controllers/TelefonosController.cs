using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/telefonos")]
[ApiController]
public class TelefonosController(AppDbContext context) : ControllerBase
{
    // GET: api/telefonos?idUsuario=1
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TelefonoUsuarioDto>>> GetTelefonos([FromQuery] int idUsuario)
    {
        if (idUsuario <= 0)
            return BadRequest("Falta un identificador de usuario válido.");

        return await context.TelefonosUsuario
            .AsNoTracking()
            .Where(t => t.IdUsuario == idUsuario)
            .OrderBy(t => t.IdTelefono)
            .Select(t => new TelefonoUsuarioDto
            {
                IdTelefono = t.IdTelefono,
                IdUsuario = t.IdUsuario,
                Telefono = t.Telefono
            })
            .ToListAsync();
    }

    [HttpGet("{idTelefono:long}")]
    public async Task<ActionResult<TelefonoUsuarioDto>> GetTelefono(long idTelefono)
    {
        var telefono = await context.TelefonosUsuario.FindAsync(idTelefono);
        return telefono is null ? NotFound() : ToDto(telefono);
    }

    [HttpPost]
    public async Task<ActionResult<TelefonoUsuarioDto>> PostTelefono(TelefonoUsuarioCreateDto dto)
    {
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
            return BadRequest("El usuario no existe.");

        var numero = dto.Telefono.Trim();
        if (await context.TelefonosUsuario.AnyAsync(t => t.IdUsuario == dto.IdUsuario && t.Telefono == numero))
            return Conflict("El usuario ya tiene registrado ese teléfono.");

        var telefono = new TelefonoUsuario { IdUsuario = dto.IdUsuario, Telefono = numero };
        context.TelefonosUsuario.Add(telefono);
        await context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetTelefono), new { idTelefono = telefono.IdTelefono }, ToDto(telefono));
    }

    [HttpPut("{idTelefono:long}")]
    public async Task<IActionResult> PutTelefono(long idTelefono, TelefonoUsuarioCreateDto dto)
    {
        var telefono = await context.TelefonosUsuario.FindAsync(idTelefono);
        if (telefono is null)
            return NotFound();

        if (telefono.IdUsuario != dto.IdUsuario)
            return BadRequest("No se puede cambiar el usuario propietario del teléfono.");

        var numero = dto.Telefono.Trim();
        if (await context.TelefonosUsuario.AnyAsync(t =>
                t.IdUsuario == telefono.IdUsuario && t.Telefono == numero && t.IdTelefono != idTelefono))
            return Conflict("El usuario ya tiene registrado ese teléfono.");

        telefono.Telefono = numero;
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idTelefono:long}")]
    public async Task<IActionResult> DeleteTelefono(long idTelefono)
    {
        var telefono = await context.TelefonosUsuario.FindAsync(idTelefono);
        if (telefono is null)
            return NotFound();

        context.TelefonosUsuario.Remove(telefono);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private static TelefonoUsuarioDto ToDto(TelefonoUsuario t) => new()
    {
        IdTelefono = t.IdTelefono,
        IdUsuario = t.IdUsuario,
        Telefono = t.Telefono
    };
}
