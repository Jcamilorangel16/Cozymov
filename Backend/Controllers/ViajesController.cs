using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

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
        public async Task<ActionResult<IEnumerable<ViajePublicoDTO>>> GetViajes(
            [FromQuery] string? origen,
            [FromQuery] string? destino,
            [FromQuery] string? fecha,
            [FromQuery(Name = "id_usuario")] int? idUsuario,
            [FromQuery(Name = "id_viaje")] long? idViaje,
            CancellationToken cancellationToken)
        {
            if (idUsuario is <= 0 || idViaje is <= 0)
            {
                return BadRequest("Los identificadores deben ser positivos.");
            }

            DateTime? fechaFiltro = null;
            if (!string.IsNullOrWhiteSpace(fecha))
            {
                if (!DateTime.TryParseExact(
                        fecha,
                        "yyyy-MM-dd",
                        CultureInfo.InvariantCulture,
                        DateTimeStyles.None,
                        out var fechaParseada))
                {
                    return BadRequest("La fecha debe tener el formato yyyy-MM-dd.");
                }

                fechaFiltro = fechaParseada.Date;
            }

            var consulta = _context.Viajes
                .AsNoTracking()
                .Include(v => v.Usuario)
                .Include(v => v.Vehiculo)
                    .ThenInclude(vehiculo => vehiculo!.Automovil)
                .Include(v => v.Vehiculo)
                    .ThenInclude(vehiculo => vehiculo!.Moto)
                .Include(v => v.Ruta)
                .Where(v => v.Estado.ToLower() == "activo" && v.CuposDisponibles > 0);

            if (!string.IsNullOrWhiteSpace(origen))
            {
                var patronOrigen = $"%{origen.Trim()}%";
                consulta = consulta.Where(v =>
                    EF.Functions.ILike(
                        v.Origen ?? (v.Ruta == null ? string.Empty : v.Ruta.Origen),
                        patronOrigen));
            }

            if (!string.IsNullOrWhiteSpace(destino))
            {
                var patronDestino = $"%{destino.Trim()}%";
                consulta = consulta.Where(v =>
                    EF.Functions.ILike(
                        v.Destino ?? (v.Ruta == null ? string.Empty : v.Ruta.Destino),
                        patronDestino));
            }

            if (fechaFiltro.HasValue)
            {
                var fechaComparar = fechaFiltro.Value;
                consulta = consulta.Where(v => v.FechaHoraSalida.Date == fechaComparar);
            }

            if (idUsuario.HasValue)
            {
                consulta = consulta.Where(v => v.IdUsuario == idUsuario.Value);
            }

            if (idViaje.HasValue)
            {
                consulta = consulta.Where(v => v.IdViaje == idViaje.Value);
            }

            var viajes = await consulta
                .OrderBy(v => v.FechaHoraSalida)
                .ThenBy(v => v.IdViaje)
                .ToListAsync(cancellationToken);

            return viajes.Select(v =>
            {
                var vehiculo = v.Vehiculo;
                return new ViajePublicoDTO(
                    v.IdViaje,
                    v.IdConductor,
                    v.IdUsuario,
                    v.IdRuta,
                    vehiculo?.IdVehiculo,
                    v.Origen ?? v.Ruta?.Origen,
                    v.Destino ?? v.Ruta?.Destino,
                    v.PuntoEncuentro,
                    v.InformacionAdicional,
                    v.FechaHoraSalida,
                    v.Costo,
                    v.CuposDisponibles,
                    v.Estado,
                    v.Usuario.PrimerNombre,
                    v.Usuario.PrimerApellido,
                    string.Join(" ", new[]
                    {
                        v.Usuario.PrimerNombre,
                        v.Usuario.SegundoNombre,
                        v.Usuario.PrimerApellido,
                        v.Usuario.SegundoApellido
                    }.Where(nombre => !string.IsNullOrWhiteSpace(nombre))),
                    v.Usuario.ocupacion,
                    vehiculo?.Tipo,
                    vehiculo?.Modelo,
                    vehiculo?.Capacidad,
                    vehiculo?.Foto,
                    vehiculo?.Automovil?.NumeroPuertas,
                    vehiculo?.Moto?.Modalidad);
            }).ToList();
        }

        // GET: api/Viajes/5
        [HttpGet("{id_viaje:long}")]
        public async Task<ActionResult<ViajeDTO>> GetViaje(
            long id_viaje,
            CancellationToken cancellationToken)
        {
            var viaje = await _context.Viajes
                .Where(v => v.IdViaje == id_viaje)
                .Select(v => new ViajeDTO
                {
                    IdViaje = v.IdViaje,
                    IdConductor = v.IdConductor,
                    IdUsuario = v.IdUsuario,
                    IdRuta = v.IdRuta,
                    IdVehiculo = v.IdVehiculo,
                    Origen = v.Origen ?? (v.Ruta == null ? null : v.Ruta.Origen),
                    Destino = v.Destino ?? (v.Ruta == null ? null : v.Ruta.Destino),
                    PuntoEncuentro = v.PuntoEncuentro,
                    InformacionAdicional = v.InformacionAdicional,
                    FechaHoraSalida = v.FechaHoraSalida,
                    Costo = v.Costo,
                    CuposDisponibles = v.CuposDisponibles,
                    Estado = v.Estado
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (viaje == null)
            {
                return NotFound();
            }

            return viaje;
        }

        [HttpGet("reserva-activa/{id_pasajero:int}")]
        public async Task<ActionResult<ReservaViajeDTO?>> GetReservaActiva(
            int id_pasajero,
            CancellationToken cancellationToken)
        {
            var reserva = await _context.ReservasViaje
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Usuario)
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Ruta)
                .FirstOrDefaultAsync(r =>
                    r.IdPasajero == id_pasajero && r.Estado == "activa",
                    cancellationToken);

            var resultado = reserva is null
                ? null
                : CrearReservaDTO(reserva, reserva.Viaje);
            return Ok(resultado);
        }

        [HttpDelete("reserva-activa/{id_pasajero:int}")]
        public async Task<IActionResult> CancelarReservaActiva(
            int id_pasajero,
            CancellationToken cancellationToken)
        {
            await using var transaccion =
                await _context.Database.BeginTransactionAsync(cancellationToken);
            var reserva = await _context.ReservasViaje
                .Include(r => r.Viaje)
                .FirstOrDefaultAsync(
                    r => r.IdPasajero == id_pasajero && r.Estado == "activa",
                    cancellationToken);

            if (reserva is null)
            {
                return NotFound("No tienes un viaje en curso para cancelar.");
            }

            reserva.Estado = "cancelada";
            if (string.Equals(reserva.Viaje.Estado, "activo", StringComparison.OrdinalIgnoreCase))
            {
                reserva.Viaje.CuposDisponibles++;
            }

            await _context.SaveChangesAsync(cancellationToken);
            await transaccion.CommitAsync(cancellationToken);

            return Ok(new { cancelada = true, id_viaje = reserva.IdViaje });
        }

        // El pasajero da por terminado su viaje: la reserva pasa a "completada"
        // (no libera el cupo) y queda disponible para calificar.
        [HttpPost("reserva-activa/{id_pasajero:int}/finalizar")]
        public async Task<IActionResult> FinalizarReservaActiva(
            int id_pasajero,
            CancellationToken cancellationToken)
        {
            var reserva = await _context.ReservasViaje
                .FirstOrDefaultAsync(
                    r => r.IdPasajero == id_pasajero && r.Estado == "activa",
                    cancellationToken);

            if (reserva is null)
            {
                return NotFound("No tienes un viaje en curso para finalizar.");
            }

            reserva.Estado = "completada";
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { finalizada = true, id_reserva = reserva.IdReserva, id_viaje = reserva.IdViaje });
        }

        [HttpGet("reservas-completadas/{id_pasajero:int}")]
        public async Task<ActionResult<IEnumerable<ReservaViajeDTO>>> GetReservasCompletadas(
            int id_pasajero,
            CancellationToken cancellationToken)
        {
            var reservas = await _context.ReservasViaje
                .AsNoTracking()
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Usuario)
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Ruta)
                .Where(r => r.IdPasajero == id_pasajero && r.Estado == "completada")
                .OrderByDescending(r => r.IdReserva)
                .ToListAsync(cancellationToken);

            return reservas.Select(r => CrearReservaDTO(r, r.Viaje)).ToList();
        }

        [HttpPost("{id_viaje:long}/reservar")]
        public async Task<ActionResult<ReservaViajeDTO>> ReservarViaje(
            long id_viaje,
            ReservaViajeCreateDTO solicitud,
            CancellationToken cancellationToken)
        {
            if (!await _context.Usuarios.AnyAsync(
                    u => u.IdPersonas == solicitud.IdPasajero,
                    cancellationToken))
            {
                return BadRequest($"El usuario {solicitud.IdPasajero} no existe.");
            }

            await using var transaccion =
                await _context.Database.BeginTransactionAsync(cancellationToken);
            var viaje = await _context.Viajes
                .FromSqlInterpolated($"SELECT * FROM viaje WHERE id_viaje = {id_viaje} FOR UPDATE")
                .Include(v => v.Usuario)
                .Include(v => v.Ruta)
                .FirstOrDefaultAsync(cancellationToken);

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
                    v.Estado.ToLower() == "activo",
                    cancellationToken))
            {
                return Conflict("Solo puedes aceptar un viaje si no tienes uno publicado.");
            }
            if (await _context.ReservasViaje.AnyAsync(r =>
                    r.IdPasajero == solicitud.IdPasajero && r.Estado == "activa",
                    cancellationToken))
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
                await _context.SaveChangesAsync(cancellationToken);
                await transaccion.CommitAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                await transaccion.RollbackAsync(cancellationToken);
                return Conflict("No se pudo reservar el viaje porque ya no está disponible.");
            }

            return Ok(CrearReservaDTO(reserva, viaje));
        }

        // PUT: api/Viajes/5
        [HttpPut("{id_viaje:long}")]
        public async Task<IActionResult> PutViaje(
            long id_viaje,
            ViajeCreateDTO viajeUpdate,
            CancellationToken cancellationToken)
        {
            var viaje = await _context.Viajes.FindAsync([id_viaje], cancellationToken);
            if (viaje == null)
            {
                return NotFound();
            }

            if (!await _context.Usuarios.AnyAsync(
                    u => u.IdPersonas == viajeUpdate.IdUsuario,
                    cancellationToken))
            {
                return BadRequest($"El usuario {viajeUpdate.IdUsuario} no existe.");
            }

            if (viajeUpdate.IdVehiculo is not null &&
                !await _context.Vehiculos.AnyAsync(
                    v => v.IdVehiculo == viajeUpdate.IdVehiculo &&
                         v.IdUsuario == viajeUpdate.IdUsuario,
                    cancellationToken))
            {
                return BadRequest("El vehículo no pertenece al usuario.");
            }

            viaje.IdConductor = viajeUpdate.IdConductor;
            viaje.IdUsuario = viajeUpdate.IdUsuario;
            viaje.IdRuta = viajeUpdate.IdRuta;
            viaje.IdVehiculo = viajeUpdate.IdVehiculo;
            if (viajeUpdate.Origen is not null)
            {
                viaje.Origen = viajeUpdate.Origen.Trim();
            }
            if (viajeUpdate.Destino is not null)
            {
                viaje.Destino = viajeUpdate.Destino.Trim();
            }
            viaje.PuntoEncuentro = viajeUpdate.PuntoEncuentro?.Trim();
            viaje.InformacionAdicional = viajeUpdate.InformacionAdicional?.Trim();
            viaje.FechaHoraSalida = ToDatabaseDateTime(viajeUpdate.FechaHoraSalida);
            viaje.Costo = viajeUpdate.Costo;
            viaje.CuposDisponibles = viajeUpdate.CuposDisponibles;
            viaje.Estado = viajeUpdate.Estado;

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!await ViajeExists(id_viaje, cancellationToken))
                {
                    return NotFound();
                }
                throw;
            }

            return NoContent();
        }

        // POST: api/Viajes
        [HttpPost]
        public async Task<ActionResult<ViajeDTO>> PostViaje(
            ViajeCreateDTO viajeCreate,
            CancellationToken cancellationToken)
        {
            if (!await _context.Usuarios.AnyAsync(
                    u => u.IdPersonas == viajeCreate.IdUsuario,
                    cancellationToken))
            {
                return BadRequest($"El usuario {viajeCreate.IdUsuario} no existe.");
            }
            if (string.IsNullOrWhiteSpace(viajeCreate.Origen) ||
                string.IsNullOrWhiteSpace(viajeCreate.Destino))
            {
                return BadRequest("El origen y el destino son obligatorios.");
            }

            if (viajeCreate.IdVehiculo is null ||
                !await _context.Vehiculos.AnyAsync(
                    v => v.IdVehiculo == viajeCreate.IdVehiculo &&
                         v.IdUsuario == viajeCreate.IdUsuario,
                    cancellationToken))
            {
                return BadRequest("El vehículo no pertenece al usuario.");
            }

            await using var transaccion =
                await _context.Database.BeginTransactionAsync(cancellationToken);
            await _context.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock({(long)viajeCreate.IdUsuario})",
                cancellationToken);

            if (await _context.ReservasViaje.AnyAsync(r =>
                    r.IdPasajero == viajeCreate.IdUsuario && r.Estado == "activa",
                    cancellationToken))
            {
                return Conflict("No puedes publicar un viaje mientras tengas uno en curso.");
            }

            var viaje = new Viaje
            {
                IdConductor = viajeCreate.IdConductor,
                IdUsuario = viajeCreate.IdUsuario,
                IdRuta = viajeCreate.IdRuta,
                IdVehiculo = viajeCreate.IdVehiculo,
                Origen = viajeCreate.Origen.Trim(),
                Destino = viajeCreate.Destino.Trim(),
                PuntoEncuentro = viajeCreate.PuntoEncuentro?.Trim(),
                InformacionAdicional = viajeCreate.InformacionAdicional?.Trim(),
                FechaHoraSalida = ToDatabaseDateTime(viajeCreate.FechaHoraSalida),
                Costo = viajeCreate.Costo,
                CuposDisponibles = viajeCreate.CuposDisponibles,
                Estado = viajeCreate.Estado
            };

            _context.Viajes.Add(viaje);
            await _context.SaveChangesAsync(cancellationToken);
            await transaccion.CommitAsync(cancellationToken);

            var viajeDto = new ViajeDTO
            {
                IdViaje = viaje.IdViaje,
                IdConductor = viaje.IdConductor,
                IdUsuario = viaje.IdUsuario,
                IdRuta = viaje.IdRuta,
                IdVehiculo = viaje.IdVehiculo,
                Origen = viaje.Origen,
                Destino = viaje.Destino,
                PuntoEncuentro = viaje.PuntoEncuentro,
                InformacionAdicional = viaje.InformacionAdicional,
                FechaHoraSalida = viaje.FechaHoraSalida,
                Costo = viaje.Costo,
                CuposDisponibles = viaje.CuposDisponibles,
                Estado = viaje.Estado
            };

            return CreatedAtAction(nameof(GetViaje), new { id_viaje = viaje.IdViaje }, viajeDto);
        }

        // DELETE: api/Viajes/5
        [HttpDelete("{id_viaje:long}")]
        public async Task<IActionResult> DeleteViaje(
            long id_viaje,
            CancellationToken cancellationToken)
        {
            var viaje = await _context.Viajes.FindAsync([id_viaje], cancellationToken);
            if (viaje == null)
            {
                return NotFound();
            }

            _context.Viajes.Remove(viaje);
            await _context.SaveChangesAsync(cancellationToken);

            return NoContent();
        }

        private Task<bool> ViajeExists(long id_viaje, CancellationToken cancellationToken)
        {
            return _context.Viajes.AnyAsync(e => e.IdViaje == id_viaje, cancellationToken);
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
                IdUsuarioConductor = viaje.IdUsuario,
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