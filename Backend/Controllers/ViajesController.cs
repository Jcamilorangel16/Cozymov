using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ViajesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ViajesController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Viajes
        [HttpGet]
        public async Task<ActionResult<IEnumerable<ViajeListaDTO>>> GetViajes()
        {
            return await _context.Viajes.Select(v => new ViajeListaDTO
            {
                IdViaje = v.IdViaje,
                IdConductor = v.IdConductor,
                IdRuta = v.IdRuta,
                FechaHoraSalida = v.FechaHoraSalida,
                Costo = v.Costo,
                CuposDisponibles = v.CuposDisponibles,
                Estado = v.Estado
            }).ToListAsync();
        }

        // GET: api/Viajes/5
        [HttpGet("{id_viaje:long}")]
        public async Task<ActionResult<ViajeDTO>> GetViaje(long id_viaje)
        {
            var viaje = await _context.Viajes
                .Where(v => v.IdViaje == id_viaje)
                .Select(v => new ViajeDTO
                {
                    IdViaje = v.IdViaje,
                    IdConductor = v.IdConductor,
                    IdRuta = v.IdRuta,
                    FechaHoraSalida = v.FechaHoraSalida,
                    Costo = v.Costo,
                    CuposDisponibles = v.CuposDisponibles,
                    Estado = v.Estado
                })
                .FirstOrDefaultAsync();

            if (viaje == null)
            {
                return NotFound();
            }

            return viaje;
        }

        // PUT: api/Viajes/5
        [HttpPut("{id_viaje:long}")]
        public async Task<IActionResult> PutViaje(long id_viaje, ViajeCreateDTO viajeUpdate)
        {
            var viaje = await _context.Viajes.FindAsync(id_viaje);
            if (viaje == null)
            {
                return NotFound();
            }

            viaje.IdConductor = viajeUpdate.IdConductor;
            viaje.IdRuta = viajeUpdate.IdRuta;
            viaje.FechaHoraSalida = ToDatabaseDateTime(viajeUpdate.FechaHoraSalida);
            viaje.Costo = viajeUpdate.Costo;
            viaje.CuposDisponibles = viajeUpdate.CuposDisponibles;
            viaje.Estado = viajeUpdate.Estado;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ViajeExists(id_viaje))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // POST: api/Viajes
        [HttpPost]
        public async Task<ActionResult<ViajeDTO>> PostViaje(ViajeCreateDTO viajeCreate)
        {
            var viaje = new Viaje
            {
                IdConductor = viajeCreate.IdConductor,
                IdRuta = viajeCreate.IdRuta,
                FechaHoraSalida = ToDatabaseDateTime(viajeCreate.FechaHoraSalida),
                Costo = viajeCreate.Costo,
                CuposDisponibles = viajeCreate.CuposDisponibles,
                Estado = viajeCreate.Estado
            };

            _context.Viajes.Add(viaje);
            await _context.SaveChangesAsync();

            var viajeDto = new ViajeDTO
            {
                IdViaje = viaje.IdViaje,
                IdConductor = viaje.IdConductor,
                IdRuta = viaje.IdRuta,
                FechaHoraSalida = viaje.FechaHoraSalida,
                Costo = viaje.Costo,
                CuposDisponibles = viaje.CuposDisponibles,
                Estado = viaje.Estado
            };

            return CreatedAtAction(nameof(GetViaje), new { id_viaje = viaje.IdViaje }, viajeDto);
        }

        // DELETE: api/Viajes/5
        [HttpDelete("{id_viaje:long}")]
        public async Task<IActionResult> DeleteViaje(long id_viaje)
        {
            var viaje = await _context.Viajes.FindAsync(id_viaje);
            if (viaje == null)
            {
                return NotFound();
            }

            _context.Viajes.Remove(viaje);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ViajeExists(long id_viaje)
        {
            return _context.Viajes.Any(e => e.IdViaje == id_viaje);
        }

        // La columna PostgreSQL es timestamp without time zone. Npgsql exige
        // DateTimeKind.Unspecified para ese tipo de columna.
        private static DateTime ToDatabaseDateTime(DateTime value)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
        }
    }
}