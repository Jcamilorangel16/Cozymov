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
                    .ThenInclude(usuario => usuario.Vehiculos)
                        .ThenInclude(vehiculo => vehiculo.Automovil)
                .Include(v => v.Usuario)
                    .ThenInclude(usuario => usuario.Vehiculos)
                        .ThenInclude(vehiculo => vehiculo.Moto)
                .Include(v => v.Ruta)
                .Where(v => v.Estado.ToLower() == "activo");

            // La búsqueda pública solo muestra viajes con cupos. Al consultar los viajes de un
            // usuario se incluyen también los llenos: siguen siendo su viaje publicado.
            if (!idUsuario.HasValue)
            {
                consulta = consulta.Where(v => v.CuposDisponibles > 0);
            }

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
                // El viaje no guarda el vehículo: se muestra el primer vehículo del conductor.
                var vehiculo = v.Usuario.Vehiculos.OrderBy(x => x.IdVehiculo).FirstOrDefault();
                return new ViajePublicoDTO(
                    v.IdViaje,
                    v.IdUsuario,
                    v.IdRuta,
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
                    IdUsuario = v.IdUsuario,
                    IdRuta = v.IdRuta,
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
            // Llegada la hora de salida el viaje está en trayecto: el pasajero ya no puede
            // salirse; solo puede finalizarlo al llegar.
            var ahora = AhoraColombia();
            if (await _context.ReservasViaje.AnyAsync(
                    r => r.IdPasajero == id_pasajero &&
                         r.Estado == "activa" &&
                         r.Viaje.FechaHoraSalida <= ahora,
                    cancellationToken))
            {
                return Conflict(
                    "El viaje ya está en trayecto: no puedes salirte. Finalízalo cuando llegues a tu destino.");
            }

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

        // Viaje privado que el conductor atiende tras aceptar una solicitud: existe la
        // reserva activa del pasajero pero el viaje no es público, así que no sale en la búsqueda.
        [HttpGet("viaje-conductor-activo/{id_conductor:int}")]
        public async Task<ActionResult<ViajeConductorActivoDTO?>> GetViajeConductorActivo(
            int id_conductor,
            CancellationToken cancellationToken)
        {
            var reserva = await _context.ReservasViaje
                .AsNoTracking()
                .Include(r => r.Pasajero)
                .Include(r => r.Viaje)
                    .ThenInclude(v => v.Ruta)
                .Where(r => r.Estado == "activa" && r.Viaje.IdUsuario == id_conductor)
                .OrderByDescending(r => r.IdReserva)
                .FirstOrDefaultAsync(cancellationToken);

            if (reserva is null)
            {
                return Ok(null);
            }

            return Ok(new ViajeConductorActivoDTO
            {
                IdViaje = reserva.IdViaje,
                IdReserva = reserva.IdReserva,
                IdPasajero = reserva.IdPasajero,
                NombrePasajero = string.Join(" ",
                    new[] { reserva.Pasajero.PrimerNombre, reserva.Pasajero.PrimerApellido }
                        .Where(nombre => !string.IsNullOrWhiteSpace(nombre))),
                Origen = reserva.Viaje.Origen ?? reserva.Viaje.Ruta?.Origen,
                Destino = reserva.Viaje.Destino ?? reserva.Viaje.Ruta?.Destino,
                FechaHoraSalida = reserva.Viaje.FechaHoraSalida,
                Costo = reserva.Viaje.Costo
            });
        }

        /// <summary>
        /// El conductor cancela el viaje que atiende: el viaje queda "cancelado" y sus reservas
        /// activas se cancelan. Si el viaje nació de una solicitud, ésta vuelve a "pendiente"
        /// para que otro conductor pueda aceptarla y el pasajero no se quede sin viaje.
        /// </summary>
        // DELETE: api/Viajes/viaje-conductor-activo/5
        [HttpDelete("viaje-conductor-activo/{id_conductor:int}")]
        public async Task<IActionResult> CancelarViajeConductor(
            int id_conductor,
            CancellationToken cancellationToken)
        {
            await using var transaccion =
                await _context.Database.BeginTransactionAsync(cancellationToken);

            // Mismo criterio que GetViajeConductorActivo: la reserva activa más reciente.
            var reservaActiva = await _context.ReservasViaje
                .Include(r => r.Viaje)
                .Where(r => r.Estado == "activa" && r.Viaje.IdUsuario == id_conductor)
                .OrderByDescending(r => r.IdReserva)
                .FirstOrDefaultAsync(cancellationToken);

            if (reservaActiva is null)
            {
                return NotFound("No tienes un viaje en curso para cancelar.");
            }

            var viaje = reservaActiva.Viaje;
            var reservas = await _context.ReservasViaje
                .Where(r => r.IdViaje == viaje.IdViaje && r.Estado == "activa")
                .ToListAsync(cancellationToken);
            foreach (var reserva in reservas)
            {
                reserva.Estado = "cancelada";
            }

            viaje.Estado = "cancelado";

            var solicitudes = await _context.Solicitudes
                .Where(s => s.IdViaje == viaje.IdViaje)
                .ToListAsync(cancellationToken);
            foreach (var solicitud in solicitudes)
            {
                solicitud.Estado = Solicitud.EstadoPendiente;
                solicitud.IdViaje = null;
            }

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                await transaccion.CommitAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaccion.RollbackAsync(cancellationToken);
                return Conflict("El viaje cambió mientras lo cancelabas. Inténtalo de nuevo.");
            }

            return Ok(new
            {
                cancelado = true,
                id_viaje = viaje.IdViaje,
                solicitudes_reabiertas = solicitudes.Count
            });
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
            if (viaje.IdUsuario == solicitud.IdPasajero)
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

            // El pasajero ya tiene conductor: su solicitud pendiente deja de tener sentido y se
            // elimina junto con la reserva (mismo guardado, en la misma transacción).
            await RetirarSolicitudesPendientes(solicitud.IdPasajero, cancellationToken);

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                await transaccion.CommitAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                // Incluye la concurrencia: si un conductor aceptó la solicitud en este instante,
                // no se completa esta reserva.
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

            // Quien espera conductor como pasajero no puede publicar un viaje como conductor.
            if (await _context.Solicitudes.AnyAsync(
                    s => s.IdUsuario == viajeCreate.IdUsuario &&
                         s.Estado == Solicitud.EstadoPendiente,
                    cancellationToken))
            {
                return Conflict(
                    "No puedes publicar un viaje mientras tengas una solicitud de viaje pendiente. Elimínala o espera a que un conductor la acepte.");
            }

            // Un conductor tiene un solo viaje publicado: si ya lo tiene, solo puede actualizarlo.
            if (await TieneViajePublicado(viajeCreate.IdUsuario, cancellationToken))
            {
                return Conflict(MensajeViajeYaPublicado);
            }

            // Para publicar hay que ser conductor: tener al menos un vehículo registrado.
            if (!await _context.Vehiculos.AnyAsync(
                    v => v.IdUsuario == viajeCreate.IdUsuario,
                    cancellationToken))
            {
                return BadRequest("Debes registrar un vehículo antes de publicar un viaje.");
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

            // Se repite dentro del bloqueo por usuario: dos envíos simultáneos no publican dos viajes.
            if (await TieneViajePublicado(viajeCreate.IdUsuario, cancellationToken))
            {
                return Conflict(MensajeViajeYaPublicado);
            }

            var viaje = new Viaje
            {
                IdUsuario = viajeCreate.IdUsuario,
                IdRuta = viajeCreate.IdRuta,
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
                IdUsuario = viaje.IdUsuario,
                IdRuta = viaje.IdRuta,
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

        /// <summary>
        /// Las salidas se guardan en hora local de Colombia (UTC-5, sin horario de verano) como
        /// "timestamp without time zone"; así se compara sin depender de la zona del servidor.
        /// </summary>
        private static DateTime AhoraColombia() =>
            DateTime.SpecifyKind(DateTime.UtcNow.AddHours(-5), DateTimeKind.Unspecified);

        private const string MensajeViajeYaPublicado =
            "Ya tienes un viaje publicado. Solo puedes actualizarlo; no puedes publicar otro.";

        /// <summary>
        /// Elimina las solicitudes de viaje que el pasajero tiene esperando conductor. Las ya
        /// aceptadas no se tocan: son el historial de un viaje. No guarda cambios.
        /// </summary>
        private async Task RetirarSolicitudesPendientes(int idPasajero, CancellationToken cancellationToken)
        {
            var pendientes = await _context.Solicitudes
                .Where(s => s.IdUsuario == idPasajero && s.Estado == Solicitud.EstadoPendiente)
                .ToListAsync(cancellationToken);
            _context.Solicitudes.RemoveRange(pendientes);
        }

        /// <summary>Viaje publicado = estado "activo" (con o sin cupos); los privados no cuentan.</summary>
        private Task<bool> TieneViajePublicado(int idUsuario, CancellationToken cancellationToken)
        {
            return _context.Viajes.AnyAsync(
                v => v.IdUsuario == idUsuario && v.Estado.ToLower() == "activo",
                cancellationToken);
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