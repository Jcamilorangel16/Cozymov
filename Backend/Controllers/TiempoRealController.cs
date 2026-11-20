using Backend.Data;
using Backend.DTOs;
using Backend.TiempoReal;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

/// <summary>
/// Emite los tickets de conexión al Hub. Está bajo /api, así que exige
/// X-Internal-Api-Key: solo el servidor de Next.js, que ya verificó la sesión e indica
/// el usuario de esa sesión, puede pedirlos.
/// </summary>
[Route("api/tiempo-real")]
[ApiController]
public sealed class TiempoRealController(AppDbContext context, AlmacenTicketsTiempoReal almacen) : ControllerBase
{
    // POST: api/tiempo-real/tickets
    [HttpPost("tickets")]
    public async Task<ActionResult<TicketTiempoRealDto>> EmitirTicket(
        TicketTiempoRealCreateDto dto,
        CancellationToken cancellationToken)
    {
        // Una cuenta borrada no debe poder conectar aunque su cookie siga firmada.
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario, cancellationToken))
        {
            return NotFound("El usuario no existe.");
        }

        var emitido = almacen.Emitir(dto.IdUsuario);
        if (emitido is null)
        {
            return StatusCode(
                StatusCodes.Status429TooManyRequests,
                "Demasiadas conexiones en poco tiempo. Inténtalo de nuevo en un minuto.");
        }

        return Ok(new TicketTiempoRealDto
        {
            Ticket = emitido.Ticket,
            ExpiraEnSegundos = (int)emitido.Vigencia.TotalSeconds
        });
    }
}
