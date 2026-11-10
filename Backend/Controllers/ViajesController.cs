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
                IdUsuario = v.IdUsuario,
                IdRuta = v.IdRuta,
                Origen = v.Origen ?? (v.Ruta == null ? null : v.Ruta.Origen),
                Destino = v.Destino ?? (v.Ruta == null ? null : v.Ruta.Destino),
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
                    IdUsuario = v.IdUsuario,
                    IdRuta = v.IdRuta,
                    Origen = v.Origen ?? (v.Ruta == null ? null : v.Ruta.Origen),
                    Destino = v.Destino ?? (v.Ruta == null ? null : v.Ruta.Destino),
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

        [HttpGet("reserva-activa/{id_pasajero:int}")]
        public async Task<ActionResult<ReservaViajeDTO?>> GetReservaActiva(int id_pasajero)
        {
            var reserva = await _context.ReservasViaje
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Usuario)
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Ruta)
                .FirstOrDefaultAsync(r =>
                    r.IdPasajero == id_pasajero && r.Estado == "activa");

            var resultado = reserva is null
                ? null
                : CrearReservaDTO(reserva, reserva.Viaje);
            return Ok(resultado);
        }

        [HttpPost("{id_viaje:long}/reservar")]
        public async Task<ActionResult<ReservaViajeDTO>> ReservarViaje(
            long id_viaje,
            ReservaViajeCreateDTO solicitud)
        {
            if (!await _context.Usuarios.AnyAsync(u => u.IdPersonas == solicitud.IdPasajero))
            {
                return BadRequest($"El usuario {solicitud.IdPasajero} no existe.");
            }

            await using var transaccion = await _context.Database.BeginTransactionAsync();
            var viaje = await _context.Viajes
                .FromSqlInterpolated($"SELECT * FROM viaje WHERE id_viaje = {id_viaje} FOR UPDATE")
                .Include(v => v.Usuario)
                .FirstOrDefaultAsync();

            if (viaje == null)
            {
                return NotFound("El viaje ya no está disponible.");
            }
            if (!string.Equals(viaje.Estado, "activo", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict("El viaje ya no está disponible.");
            }
            if (viaje.IdUsuario == solicitud.IdPasajero ||
                string.Equals(viaje.IdConductor, solicitud.IdPasajero.ToString(), StringComparison.Ordinal))
            {
                return BadRequest("No puedes aceptar tu propio viaje.");
            }
            if (await _context.Viajes.AnyAsync(v =>
                    v.IdUsuario == solicitud.IdPasajero &&
                    v.Estado.ToLower() == "activo"))
            {
                return Conflict("Solo puedes aceptar un viaje si no tienes uno publicado.");
            }
            if (await _context.ReservasViaje.AnyAsync(r =>
                    r.IdPasajero == solicitud.IdPasajero && r.Estado == "activa"))
            {
                return Conflict("Ya tienes un viaje en curso.");
            }
            if (viaje.CuposDisponibles < 1)
            {
                return Conflict("El viaje ya no tiene cupos disponibles.");
            }

            viaje.CuposDisponibles--;
            var reserva = new ReservaViaje
            {
                IdViaje = viaje.IdViaje,
                IdPasajero = solicitud.IdPasajero,
                FechaReserva = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
                Estado = "activa"
            };
            _context.ReservasViaje.Add(reserva);

            try
            {
                await _context.SaveChangesAsync();
                await transaccion.CommitAsync();
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync();
                return Conflict("No se pudo reservar el viaje porque ya no está disponible.");
            }

            return Ok(CrearReservaDTO(reserva, viaje));
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

            if (!await _context.Usuarios.AnyAsync(u => u.IdPersonas == viajeUpdate.IdUsuario))
            {
                return BadRequest($"El usuario {viajeUpdate.IdUsuario} no existe.");
            }

            viaje.IdConductor = viajeUpdate.IdConductor;
            viaje.IdUsuario = viajeUpdate.IdUsuario;
            viaje.IdRuta = viajeUpdate.IdRuta;
            if (viajeUpdate.Origen is not null)
            {
                viaje.Origen = viajeUpdate.Origen.Trim();
            }
            if (viajeUpdate.Destino is not null)
            {
                viaje.Destino = viajeUpdate.Destino.Trim();
            }
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
            if (!await _context.Usuarios.AnyAsync(u => u.IdPersonas == viajeCreate.IdUsuario))
            {
                return BadRequest($"El usuario {viajeCreate.IdUsuario} no existe.");
            }
            if (string.IsNullOrWhiteSpace(viajeCreate.Origen) ||
                string.IsNullOrWhiteSpace(viajeCreate.Destino))
            {
                return BadRequest("El origen y el destino son obligatorios.");
            }

            var viaje = new Viaje
            {
                IdConductor = viajeCreate.IdConductor,
                IdUsuario = viajeCreate.IdUsuario,
                IdRuta = viajeCreate.IdRuta,
                Origen = viajeCreate.Origen.Trim(),
                Destino = viajeCreate.Destino.Trim(),
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
                IdUsuario = viaje.IdUsuario,
                IdRuta = viaje.IdRuta,
                Origen = viaje.Origen,
                Destino = viaje.Destino,
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

        private static ReservaViajeDTO CrearReservaDTO(ReservaViaje reserva, Viaje viaje)
        {
            return new ReservaViajeDTO
            {
                IdReserva = reserva.IdReserva,
                IdViaje = viaje.IdViaje,
                IdPasajero = reserva.IdPasajero,
                Origen = viaje.Origen ?? viaje.Ruta?.Origen,
                Destino = viaje.Destino ?? viaje.Ruta?.Destino,
                FechaHoraSalida = viaje.FechaHoraSalida,
                Costo = viaje.Costo,
                IdConductor = viaje.IdConductor,
                NombreConductor = string.Join(" ",
                    new[] { viaje.Usuario.PrimerNombre, viaje.Usuario.PrimerApellido }
                        .Where(nombre => !string.IsNullOrWhiteSpace(nombre)))
            };
        }

        // La columna PostgreSQL es timestamp without time zone. Npgsql exige
        // DateTimeKind.Unspecified para ese tipo de columna.
        private static DateTime ToDatabaseDateTime(DateTime value)
        {
            return DateTime.SpecifyKind(value, DateTimeKind.Unspecified);
        }
    }
}