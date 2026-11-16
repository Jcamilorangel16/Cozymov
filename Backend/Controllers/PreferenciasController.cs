using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/preferencias")]
[ApiController]
public class PreferenciasController(AppDbContext context) : ControllerBase
{
    [HttpGet("{idUsuario:int}")]
    public async Task<ActionResult<PreferenciaDto>> GetPreferencia(int idUsuario)
    {
        var preferencia = await context.Preferencias.AsNoTracking()
            .FirstOrDefaultAsync(p => p.IdUsuario == idUsuario);
        return preferencia is null ? NotFound() : ToDto(preferencia);
    }

    // Crea o reemplaza la preferencia del usuario (relación 0..1).
    [HttpPut("{idUsuario:int}")]
    public async Task<ActionResult<PreferenciaDto>> PutPreferencia(int idUsuario, PreferenciaUpsertDto dto)
    {
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == idUsuario))
            return NotFound("El usuario no existe.");

        var preferencia = await context.Preferencias.FindAsync(idUsuario);
        if (preferencia is null)
        {
            preferencia = new Preferencia { IdUsuario = idUsuario };
            context.Preferencias.Add(preferencia);
        }

        preferencia.PrioridadCosto = dto.PrioridadCosto;
        preferencia.PrioridadTiempo = dto.PrioridadTiempo;
        preferencia.PreferirCompartir = dto.PreferirCompartir;

        await context.SaveChangesAsync();
        return ToDto(preferencia);
    }

    [HttpDelete("{idUsuario:int}")]
    public async Task<IActionResult> DeletePreferencia(int idUsuario)
    {
        var preferencia = await context.Preferencias.FindAsync(idUsuario);
        if (preferencia is null)
            return NotFound();

        context.Preferencias.Remove(preferencia);
        await context.SaveChangesAsync();
        return NoContent();
    }

    private static PreferenciaDto ToDto(Preferencia p) => new()
    {
        IdUsuario = p.IdUsuario,
        PrioridadCosto = p.PrioridadCosto,
        PrioridadTiempo = p.PrioridadTiempo,
        PreferirCompartir = p.PreferirCompartir
    };
}
