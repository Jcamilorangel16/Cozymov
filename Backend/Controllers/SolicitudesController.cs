using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[Route("api/solicitudes")]
[ApiController]
public class SolicitudesController(AppDbContext context) : ControllerBase
{
    /// <summary>
    /// Estado del viaje que se crea al aceptar una solicitud. No es "activo", así que
    /// no aparece en la búsqueda pública de viajes ni cuenta como viaje publicado.
    /// </summary>
    private const string EstadoViajePrivado = "privado";

    // GET: api/solicitudes?idUsuario=1&idRuta=2&compartir=true&estado=pendiente
    [HttpGet]
    public async Task<ActionResult<IEnumerable<SolicitudDto>>> GetSolicitudes(
        [FromQuery] int? idUsuario,
        [FromQuery] long? idRuta,
        [FromQuery] bool? compartir,
        [FromQuery] string? estado)
    {
        var consulta = context.Solicitudes.AsNoTracking().Include(s => s.Ruta).AsQueryable();
        if (idUsuario is not null) consulta = consulta.Where(s => s.IdUsuario == idUsuario);
        if (idRuta is not null) consulta = consulta.Where(s => s.IdRuta == idRuta);
        if (compartir is not null) consulta = consulta.Where(s => s.Compartir == compartir);
        if (!string.IsNullOrWhiteSpace(estado))
        {
            var buscado = estado.Trim().ToLower();
            consulta = consulta.Where(s => s.Estado.ToLower() == buscado);
        }

        var solicitudes = await consulta
            .OrderByDescending(s => s.FechaHora)
            .ToListAsync();

        return solicitudes.Select(ToDto).ToList();
    }

    /// <summary>
    /// Solicitudes que ningún conductor ha aceptado todavía, sin las del propio usuario.
    /// Alimenta la sección de solicitudes pendientes de «Buscar».
    /// </summary>
    // GET: api/solicitudes/pendientes?idUsuario=1
    [HttpGet("pendientes")]
    public async Task<ActionResult<IEnumerable<SolicitudPendienteDto>>> GetPendientes(
        [FromQuery] int? idUsuario)
    {
        var consulta = context.Solicitudes.AsNoTracking()
            .Include(s => s.Ruta)
            .Include(s => s.Usuario)
            .Where(s => s.Estado == Solicitud.EstadoPendiente);

        if (idUsuario is not null)
            consulta = consulta.Where(s => s.IdUsuario != idUsuario);

        var solicitudes = await consulta
            .OrderBy(s => s.FechaHora)
            .ToListAsync();

        return solicitudes.Select(s => new SolicitudPendienteDto
        {
            IdSolicitud = s.IdSolicitud,
            IdUsuario = s.IdUsuario,
            NombreUsuario = NombreDe(s.Usuario),
            Origen = s.Ruta?.Origen,
            Destino = s.Ruta?.Destino,
            FechaHora = s.FechaHora,
            HoraLimite = s.HoraLimite,
            Presupuesto = s.Presupuesto,
            Compartir = s.Compartir
        }).ToList();
    }

    [HttpGet("{idSolicitud:long}")]
    public async Task<ActionResult<SolicitudDto>> GetSolicitud(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.AsNoTracking()
            .Include(s => s.Ruta)
            .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud);
        return solicitud is null ? NotFound() : ToDto(solicitud);
    }

    // Viajes que coinciden con la solicitud: misma ruta, salida el mismo día,
    // con cupos y dentro del presupuesto (y antes de la hora límite si existe).
    [HttpGet("{idSolicitud:long}/coincidencias")]
    public async Task<ActionResult<IEnumerable<ViajeCoincidenciaDto>>> GetCoincidencias(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.AsNoTracking()
            .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud);
        if (solicitud is null)
            return NotFound();

        var dia = solicitud.FechaHora.Date;
        var siguiente = dia.AddDays(1);
        var presupuesto = solicitud.Presupuesto;

        var viajes = await context.Viajes.AsNoTracking()
            .Where(v => v.IdRuta == solicitud.IdRuta
                && v.CuposDisponibles > 0
                && v.FechaHoraSalida >= dia && v.FechaHoraSalida < siguiente
                && (presupuesto == null || v.Costo <= presupuesto)
                && v.Estado.ToLower() != "cancelado" && v.Estado.ToLower() != "finalizado")
            .OrderBy(v => v.FechaHoraSalida)
            .Select(v => new ViajeCoincidenciaDto
            {
                IdViaje = v.IdViaje,
                FechaHoraSalida = v.FechaHoraSalida,
                Costo = v.Costo,
                CuposDisponibles = v.CuposDisponibles,
                Estado = v.Estado
            })
            .ToListAsync();

        if (solicitud.HoraLimite is { } limite)
            viajes = viajes.Where(v => TimeOnly.FromDateTime(v.FechaHoraSalida) <= limite).ToList();

        return viajes;
    }

    [HttpPost]
    public async Task<ActionResult<SolicitudDto>> PostSolicitud(SolicitudCreateDto dto)
    {
        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
            return BadRequest("El usuario no existe.");

        // Un conductor con un viaje publicado no pide viaje como pasajero: primero debe
        // retirar o completar el suyo (es la misma regla que impide publicar con una solicitud).
        if (await context.Viajes.AnyAsync(
                v => v.IdUsuario == dto.IdUsuario && v.Estado.ToLower() == "activo"))
            return Conflict(
                "No puedes solicitar un viaje mientras tengas un viaje publicado. Cancélalo o espera a que termine para pedir uno.");

        // Un pasajero solo puede tener una solicitud esperando conductor a la vez.
        if (await context.Solicitudes.AnyAsync(
                s => s.IdUsuario == dto.IdUsuario && s.Estado == Solicitud.EstadoPendiente))
            return Conflict(
                "Ya tienes una solicitud de viaje pendiente. Elimínala o espera a que un conductor la acepte para pedir otra.");

        var resuelta = await ResolverRuta(dto);
        if (resuelta.Error is not null)
            return resuelta.Error;

        var solicitud = new Solicitud { Estado = Solicitud.EstadoPendiente };
        Aplicar(solicitud, dto, resuelta.IdRuta);
        context.Solicitudes.Add(solicitud);
        await context.SaveChangesAsync();

        var ruta = await context.Rutas.FindAsync(solicitud.IdRuta);
        if (ruta is not null) solicitud.Ruta = ruta;
        return CreatedAtAction(nameof(GetSolicitud), new { idSolicitud = solicitud.IdSolicitud }, ToDto(solicitud));
    }

    /// <summary>
    /// Un conductor elegible acepta la solicitud: se crea el viaje privado y la reserva
    /// activa del pasajero que la pidió. No se publica ningún viaje público y el viaje
    /// publicado del conductor, si tenía uno, se retira.
    /// </summary>
    // POST: api/solicitudes/5/aceptar
    [HttpPost("{idSolicitud:long}/aceptar")]
    public async Task<ActionResult<ReservaViajeDTO>> AceptarSolicitud(
        long idSolicitud,
        SolicitudAceptarDto dto,
        CancellationToken cancellationToken)
    {
        var solicitud = await context.Solicitudes
            .Include(s => s.Ruta)
            .FirstOrDefaultAsync(s => s.IdSolicitud == idSolicitud, cancellationToken);
        if (solicitud is null)
            return NotFound("La solicitud no existe.");
        if (!string.Equals(solicitud.Estado, Solicitud.EstadoPendiente, StringComparison.OrdinalIgnoreCase))
            return Conflict("La solicitud ya fue aceptada por otro conductor.");
        if (solicitud.IdUsuario == dto.IdConductor)
            return BadRequest("No puedes aceptar tu propia solicitud.");

        var conductor = await context.Usuarios
            .FirstOrDefaultAsync(u => u.IdPersonas == dto.IdConductor, cancellationToken);
        if (conductor is null)
            return BadRequest("El conductor no existe.");

        if (!await context.Vehiculos.AnyAsync(v => v.IdUsuario == dto.IdConductor, cancellationToken))
            return Conflict("Debes registrar un vehículo para aceptar solicitudes.");

        if (await context.ReservasViaje.AnyAsync(
                r => r.IdPasajero == dto.IdConductor && r.Estado == "activa", cancellationToken))
            return Conflict("Tienes un viaje en curso; finalízalo antes de aceptar una solicitud.");

        if (await context.ReservasViaje.AnyAsync(
                r => r.Estado == "activa" && r.Viaje.IdUsuario == dto.IdConductor, cancellationToken))
            return Conflict("Ya estás atendiendo otra solicitud; termínala antes de aceptar otra.");

        if (await context.ReservasViaje.AnyAsync(
                r => r.IdPasajero == solicitud.IdUsuario && r.Estado == "activa", cancellationToken))
            return Conflict("Quien hizo la solicitud ya tiene un viaje en curso.");

        // Un conductor atiende un solo viaje a la vez: su viaje publicado deja de existir.
        // (Si tuviera pasajeros activos, ya se habría rechazado la solicitud arriba.)
        await RetirarViajesPublicados(dto.IdConductor, cancellationToken);

        var viaje = new Viaje
        {
            IdUsuario = dto.IdConductor,
            IdRuta = solicitud.IdRuta,
            Origen = solicitud.Ruta?.Origen,
            Destino = solicitud.Ruta?.Destino,
            FechaHoraSalida = solicitud.FechaHora,
            Costo = solicitud.Presupuesto ?? 0m,
            CuposDisponibles = 0,
            Estado = EstadoViajePrivado
        };
        context.Viajes.Add(viaje);

        var reserva = new ReservaViaje
        {
            Viaje = viaje,
            IdPasajero = solicitud.IdUsuario,
            FechaReserva = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Unspecified),
            Estado = "activa"
        };
        context.ReservasViaje.Add(reserva);

        solicitud.Estado = Solicitud.EstadoAceptada;
        solicitud.Viaje = viaje;

        try
        {
            // Un solo SaveChanges: viaje, reserva y solicitud se guardan juntos o no se guarda nada.
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("La solicitud ya fue aceptada por otro conductor.");
        }

        viaje.Usuario = conductor;
        return Ok(CrearReservaDto(reserva, viaje));
    }

    /// <summary>
    /// Quita los viajes publicados (estado "activo") del conductor. Se eliminan cuando nunca
    /// tuvieron reservas; si ya tienen historial (reservas completadas o canceladas) se marcan
    /// "cancelado" para no borrar en cascada las reservas ni sus calificaciones. No guarda
    /// cambios: se confirman junto con el resto de la aceptación.
    /// </summary>
    private async Task RetirarViajesPublicados(int idConductor, CancellationToken cancellationToken)
    {
        var publicados = await context.Viajes
            .Where(v => v.IdUsuario == idConductor && v.Estado.ToLower() == "activo")
            .ToListAsync(cancellationToken);
        if (publicados.Count == 0)
            return;

        var ids = publicados.Select(v => v.IdViaje).ToList();
        var conHistorial = await context.ReservasViaje
            .Where(r => ids.Contains(r.IdViaje))
            .Select(r => r.IdViaje)
            .Distinct()
            .ToListAsync(cancellationToken);

        foreach (var publicado in publicados)
        {
            if (conHistorial.Contains(publicado.IdViaje))
                publicado.Estado = "cancelado";
            else
                context.Viajes.Remove(publicado);
        }
    }

    [HttpPut("{idSolicitud:long}")]
    public async Task<IActionResult> PutSolicitud(long idSolicitud, SolicitudCreateDto dto)
    {
        var solicitud = await context.Solicitudes.FindAsync(idSolicitud);
        if (solicitud is null)
            return NotFound();

        if (solicitud.IdUsuario != dto.IdUsuario)
            return BadRequest("No se puede cambiar el usuario de la solicitud.");
        if (!string.Equals(solicitud.Estado, Solicitud.EstadoPendiente, StringComparison.OrdinalIgnoreCase))
            return Conflict("La solicitud ya fue aceptada y no se puede editar.");

        if (!await context.Usuarios.AnyAsync(u => u.IdPersonas == dto.IdUsuario))
            return BadRequest("El usuario no existe.");

        var resuelta = await ResolverRuta(dto);
        if (resuelta.Error is not null)
            return resuelta.Error;

        Aplicar(solicitud, dto, resuelta.IdRuta);
        await context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{idSolicitud:long}")]
    public async Task<IActionResult> DeleteSolicitud(long idSolicitud)
    {
        var solicitud = await context.Solicitudes.FindAsync(idSolicitud);
        if (solicitud is null)
            return NotFound();
        if (!string.Equals(solicitud.Estado, Solicitud.EstadoPendiente, StringComparison.OrdinalIgnoreCase))
            return Conflict("La solicitud ya fue aceptada; cancela el viaje en curso en su lugar.");

        context.Solicitudes.Remove(solicitud);
        await context.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Devuelve la ruta indicada por IdRuta o, si viene en 0, busca una ruta con el mismo
    /// origen y destino (sin distinguir mayúsculas) y la crea cuando no existe.
    /// </summary>
    private async Task<(long IdRuta, BadRequestObjectResult? Error)> ResolverRuta(SolicitudCreateDto dto)
    {
        if (dto.IdRuta > 0)
        {
            return await context.Rutas.AnyAsync(r => r.IdRuta == dto.IdRuta)
                ? (dto.IdRuta, null)
                : (0, BadRequest("La ruta no existe."));
        }

        var origen = (dto.Origen ?? string.Empty).Trim();
        var destino = (dto.Destino ?? string.Empty).Trim();
        if (origen.Length == 0 || destino.Length == 0)
            return (0, BadRequest("Indica el origen y el destino de la solicitud."));
        if (string.Equals(origen, destino, StringComparison.OrdinalIgnoreCase))
            return (0, BadRequest("El origen y el destino deben ser diferentes."));

        var existente = await context.Rutas
            .FirstOrDefaultAsync(r => r.Origen.ToLower() == origen.ToLower()
                && r.Destino.ToLower() == destino.ToLower());
        if (existente is not null)
            return (existente.IdRuta, null);

        var ruta = new Ruta
        {
            Origen = origen,
            Destino = destino,
            LatOrigen = dto.LatOrigen ?? 0m,
            LonOrigen = dto.LonOrigen ?? 0m,
            LatDestino = dto.LatDestino ?? 0m,
            LonDestino = dto.LonDestino ?? 0m
        };
        context.Rutas.Add(ruta);
        await context.SaveChangesAsync();
        return (ruta.IdRuta, null);
    }

    private static void Aplicar(Solicitud solicitud, SolicitudCreateDto dto, long idRuta)
    {
        solicitud.IdUsuario = dto.IdUsuario;
        solicitud.IdRuta = idRuta;
        solicitud.FechaHora = DateTime.SpecifyKind(dto.FechaHora, DateTimeKind.Unspecified);
        solicitud.HoraLimite = dto.HoraLimite;
        solicitud.Presupuesto = dto.Presupuesto;
        solicitud.Compartir = dto.Compartir;
    }

    private static string NombreDe(Usuarios? usuario) => usuario is null
        ? string.Empty
        : string.Join(" ", new[] { usuario.PrimerNombre, usuario.PrimerApellido }
            .Where(parte => !string.IsNullOrWhiteSpace(parte)));

    private static ReservaViajeDTO CrearReservaDto(ReservaViaje reserva, Viaje viaje) => new()
    {
        IdReserva = reserva.IdReserva,
        IdViaje = viaje.IdViaje,
        IdPasajero = reserva.IdPasajero,
        Origen = viaje.Origen ?? viaje.Ruta?.Origen,
        Destino = viaje.Destino ?? viaje.Ruta?.Destino,
        FechaHoraSalida = viaje.FechaHoraSalida,
        Costo = viaje.Costo,
        IdUsuarioConductor = viaje.IdUsuario,
        NombreConductor = NombreDe(viaje.Usuario)
    };

    private static SolicitudDto ToDto(Solicitud s) => new()
    {
        IdSolicitud = s.IdSolicitud,
        IdUsuario = s.IdUsuario,
        IdRuta = s.IdRuta,
        FechaHora = s.FechaHora,
        HoraLimite = s.HoraLimite,
        Presupuesto = s.Presupuesto,
        Compartir = s.Compartir,
        Estado = s.Estado,
        IdViaje = s.IdViaje,
        Origen = s.Ruta?.Origen,
        Destino = s.Ruta?.Destino
    };
}
