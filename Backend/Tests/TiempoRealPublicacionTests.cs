using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.TiempoReal;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

/// <summary>Guarda lo publicado y, en el momento de publicar, ejecuta una comprobación.</summary>
internal sealed class NotificadorDePrueba : INotificadorTiempoReal
{
    public List<(object Evento, int[] Destinatarios)> Publicados { get; } = [];

    /// <summary>Se ejecuta justo al publicar: sirve para ver qué hay guardado en ese instante.</summary>
    public Action? AlPublicar { get; set; }

    public void PublicarMensajeNuevo(MensajeNuevoEvento evento) =>
        Registrar(evento, [evento.IdEmisor, evento.IdReceptor]);

    public void PublicarMensajesLeidos(MensajesLeidosEvento evento) =>
        Registrar(evento, [evento.IdLector, evento.IdEmisor]);

    public void PublicarViajeActualizado(ViajeActualizadoEvento evento, IEnumerable<int> destinatarios) =>
        Registrar(evento, destinatarios.Distinct().Order().ToArray());

    private void Registrar(object evento, int[] destinatarios)
    {
        AlPublicar?.Invoke();
        Publicados.Add((evento, destinatarios));
    }

    public T Unico<T>() => Assert.IsType<T>(Assert.Single(Publicados).Evento);
}

/// <summary>
/// Los eventos se publican desde los flujos HTTP existentes y solo después de guardar.
/// Una operación rechazada no publica nada.
/// </summary>
public sealed class TiempoRealPublicacionTests
{
    private const int Conductor = 1;
    private const int Pasajero = 2;
    private const int OtroPasajero = 3;

    private readonly string _baseDatos = Guid.NewGuid().ToString();
    private readonly NotificadorDePrueba _notificador = new();

    private AppDbContext NuevoContexto() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(_baseDatos)
        .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
        .Options);

    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = $"Nombre{id}", SegundoNombre = "",
        PrimerApellido = $"Apellido{id}", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static DateTime SalidaEn(TimeSpan desdeAhora) => DateTime.SpecifyKind(
        DateTime.UtcNow.AddHours(-5) + desdeAhora, DateTimeKind.Unspecified);

    private async Task<AppDbContext> ContextoConUsuarios()
    {
        var context = NuevoContexto();
        context.Usuarios.AddRange(NuevoUsuario(Conductor), NuevoUsuario(Pasajero), NuevoUsuario(OtroPasajero));
        await context.SaveChangesAsync();
        return context;
    }

    /// <summary>Viaje 10 del conductor con reservas: 20 activa (pasajero 2), 21 activa (pasajero 3) opcional.</summary>
    private async Task<AppDbContext> ContextoConViaje(bool dosPasajeros = false, string estadoViaje = "Activo")
    {
        var context = await ContextoConUsuarios();
        context.Viajes.Add(new Viaje
        {
            IdViaje = 10, IdUsuario = Conductor, Origen = "A", Destino = "B", Costo = 3000,
            CuposDisponibles = 1, Estado = estadoViaje, FechaHoraSalida = SalidaEn(TimeSpan.FromHours(1))
        });
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = Pasajero, Estado = "activa" });
        if (dosPasajeros)
        {
            context.ReservasViaje.Add(new ReservaViaje { IdReserva = 21, IdViaje = 10, IdPasajero = OtroPasajero, Estado = "activa" });
        }
        await context.SaveChangesAsync();
        return context;
    }

    // ---- Mensajes ----

    [Fact]
    public async Task UnMensajeSePublicaDespuesDeGuardarseYSoloASusParticipantes()
    {
        await using var context = await ContextoConUsuarios();
        var guardadoAlPublicar = false;
        _notificador.AlPublicar = () =>
        {
            using var otro = NuevoContexto();
            guardadoAlPublicar = otro.Mensajes.Any(m => m.Contenido == "¿Ya vienes?");
        };

        var resultado = await new MensajesController(context, _notificador).PostMensaje(
            new MensajeCreateDTO { IdEmisor = Pasajero, IdReceptor = Conductor, Contenido = "  ¿Ya vienes?  " });

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
        Assert.True(guardadoAlPublicar, "El evento se publicó antes de guardar el mensaje.");
        var evento = _notificador.Unico<MensajeNuevoEvento>();
        var guardado = await context.Mensajes.SingleAsync();
        Assert.Equal(VersionEventos.Actual, evento.Version);
        Assert.Equal(guardado.IdMensaje, evento.IdMensaje);
        Assert.Equal(Pasajero, evento.IdEmisor);
        Assert.Equal(Conductor, evento.IdReceptor);
        Assert.Equal("Nombre2 Apellido2", evento.NombreEmisor);
        Assert.Equal("¿Ya vienes?", evento.Contenido);
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios.Order());
    }

    [Theory]
    [InlineData(Pasajero, 404, "hola")]  // destinatario inexistente
    [InlineData(Pasajero, Pasajero, "hola")] // a sí mismo
    [InlineData(Pasajero, Conductor, "   ")]  // vacío
    public async Task UnMensajeRechazadoNoPublicaNada(int emisor, int receptor, string contenido)
    {
        await using var context = await ContextoConUsuarios();

        var resultado = await new MensajesController(context, _notificador).PostMensaje(
            new MensajeCreateDTO { IdEmisor = emisor, IdReceptor = receptor, Contenido = contenido });

        Assert.IsNotType<CreatedAtActionResult>(resultado.Result);
        Assert.Empty(_notificador.Publicados);
        Assert.Empty(context.Mensajes);
    }

    [Fact]
    public async Task LeerUnaConversacionPublicaHastaQueMensajeSeLeyo()
    {
        await using var context = await ContextoConUsuarios();
        context.Mensajes.AddRange(
            new Mensaje { IdMensaje = 1, IdEmisor = Conductor, IdReceptor = Pasajero, Contenido = "a", FechaHora = DateTime.UtcNow.AddMinutes(-3) },
            new Mensaje { IdMensaje = 2, IdEmisor = Conductor, IdReceptor = Pasajero, Contenido = "b", FechaHora = DateTime.UtcNow.AddMinutes(-2) },
            // Un mensaje del lector no cuenta como leído por él.
            new Mensaje { IdMensaje = 3, IdEmisor = Pasajero, IdReceptor = Conductor, Contenido = "c", FechaHora = DateTime.UtcNow.AddMinutes(-1) });
        await context.SaveChangesAsync();
        var leidosAlPublicar = 0;
        _notificador.AlPublicar = () =>
        {
            using var otro = NuevoContexto();
            leidosAlPublicar = otro.Mensajes.Count(m => m.IdReceptor == Pasajero && m.Leido);
        };

        await new MensajesController(context, _notificador).GetConversacion(Pasajero, Conductor);

        var evento = _notificador.Unico<MensajesLeidosEvento>();
        Assert.Equal(2, leidosAlPublicar);
        Assert.Equal(Pasajero, evento.IdLector);
        Assert.Equal(Conductor, evento.IdEmisor);
        Assert.Equal(2, evento.HastaIdMensaje);
        Assert.False((await context.Mensajes.FindAsync(3))!.Leido);
    }

    [Fact]
    public async Task ConsultarUnaConversacionYaLeidaNoPublicaNada()
    {
        await using var context = await ContextoConUsuarios();
        context.Mensajes.Add(new Mensaje { IdMensaje = 1, IdEmisor = Conductor, IdReceptor = Pasajero, Contenido = "a", Leido = true, FechaHora = DateTime.UtcNow });
        await context.SaveChangesAsync();

        await new MensajesController(context, _notificador).GetConversacion(Pasajero, Conductor);
        // Quien envió los mensajes tampoco los marca como leídos.
        await new MensajesController(context, _notificador).GetConversacion(Conductor, Pasajero);

        Assert.Empty(_notificador.Publicados);
    }

    // ---- Reservas y viajes ----

    [Fact]
    public async Task SalirDelViajeAvisaAlConductorDespuesDeGuardar()
    {
        await using var context = await ContextoConViaje();
        string? estadoAlPublicar = null;
        _notificador.AlPublicar = () =>
        {
            using var otro = NuevoContexto();
            estadoAlPublicar = otro.ReservasViaje.Single(r => r.IdReserva == 20).Estado;
        };

        var resultado = await new ViajesController(context, _notificador).CancelarReservaActiva(Pasajero, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        Assert.Equal("cancelada", estadoAlPublicar);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.ReservaCancelada, evento.Motivo);
        Assert.Equal(10, evento.IdViaje);
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios);
    }

    [Fact]
    public async Task NoSePuedeSalirDeUnViajeEnTrayectoNiSePublicaNada()
    {
        await using var context = await ContextoConViaje();
        (await context.Viajes.FindAsync(10L))!.FechaHoraSalida = SalidaEn(TimeSpan.FromMinutes(-5));
        await context.SaveChangesAsync();

        var resultado = await new ViajesController(context, _notificador).CancelarReservaActiva(Pasajero, CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(resultado);
        Assert.Empty(_notificador.Publicados);
    }

    [Fact]
    public async Task FinalizarAvisaAlConductorSinLiberarCuposNiCerrarElViaje()
    {
        await using var context = await ContextoConViaje(dosPasajeros: true);

        var resultado = await new ViajesController(context, _notificador).FinalizarReservaActiva(Pasajero, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.ReservaFinalizada, evento.Motivo);
        // El otro pasajero no se entera: su reserva no cambió.
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios);
        var viaje = await context.Viajes.FindAsync(10L);
        Assert.Equal(1, viaje!.CuposDisponibles);
        Assert.Equal("Activo", viaje.Estado);
        Assert.Equal("activa", (await context.ReservasViaje.FindAsync(21L))!.Estado);
    }

    [Fact]
    public async Task FinalizarSinViajeEnCursoNoPublicaNada()
    {
        await using var context = await ContextoConUsuarios();

        var resultado = await new ViajesController(context, _notificador).FinalizarReservaActiva(Pasajero, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(resultado);
        Assert.Empty(_notificador.Publicados);
    }

    [Fact]
    public async Task CancelarComoConductorAvisaATodosLosPasajerosActivos()
    {
        await using var context = await ContextoConViaje(dosPasajeros: true);

        var resultado = await new ViajesController(context, _notificador).CancelarViajeConductor(Conductor, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.ViajeCancelado, evento.Motivo);
        Assert.Equal(new[] { Conductor, Pasajero, OtroPasajero }, _notificador.Publicados[0].Destinatarios);
    }

    [Fact]
    public async Task EditarElViajeAvisaSoloAQuienesSiguenEnEl()
    {
        await using var context = await ContextoConViaje(dosPasajeros: true);
        (await context.ReservasViaje.FindAsync(21L))!.Estado = "completada";
        await context.SaveChangesAsync();

        var resultado = await new ViajesController(context, _notificador).PutViaje(10, new ViajeCreateDTO
        {
            IdUsuario = Conductor, Origen = "A", Destino = "B", FechaHoraSalida = DateTime.Now.AddHours(3),
            Costo = 4500, CuposDisponibles = 1, Estado = "Activo"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(resultado);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.ViajeModificado, evento.Motivo);
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios);
    }

    [Fact]
    public async Task BorrarElViajeAvisaALosPasajerosQueTeniaAntesDeBorrarse()
    {
        await using var context = await ContextoConViaje();

        var resultado = await new ViajesController(context, _notificador).DeleteViaje(10, CancellationToken.None);

        Assert.IsType<NoContentResult>(resultado);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.ViajeEliminado, evento.Motivo);
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios);
        Assert.Empty(context.Viajes);
    }

    [Fact]
    public async Task AceptarUnaSolicitudAvisaAlPasajeroConElViajeGuardado()
    {
        await using var context = await ContextoConUsuarios();
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = Conductor });
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Solicitudes.Add(new Solicitud
        {
            IdSolicitud = 100, IdUsuario = Pasajero, IdRuta = 1, FechaHora = SalidaEn(TimeSpan.FromHours(1)),
            Presupuesto = 3500, Estado = Solicitud.EstadoPendiente
        });
        await context.SaveChangesAsync();
        long? viajeAlPublicar = null;
        _notificador.AlPublicar = () =>
        {
            using var otro = NuevoContexto();
            viajeAlPublicar = otro.Solicitudes.Single(s => s.IdSolicitud == 100).IdViaje;
        };

        var resultado = await new SolicitudesController(context, _notificador).AceptarSolicitud(
            100, new SolicitudAceptarDto { IdConductor = Conductor }, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado.Result);
        var evento = _notificador.Unico<ViajeActualizadoEvento>();
        Assert.Equal(MotivoViaje.SolicitudAceptada, evento.Motivo);
        Assert.Equal(viajeAlPublicar, evento.IdViaje);
        Assert.Equal(new[] { Conductor, Pasajero }, _notificador.Publicados[0].Destinatarios);
    }

    [Fact]
    public async Task AceptarSuPropiaSolicitudNoPublicaNada()
    {
        await using var context = await ContextoConUsuarios();
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Solicitudes.Add(new Solicitud { IdSolicitud = 100, IdUsuario = Pasajero, IdRuta = 1, Estado = Solicitud.EstadoPendiente });
        await context.SaveChangesAsync();

        var resultado = await new SolicitudesController(context, _notificador).AceptarSolicitud(
            100, new SolicitudAceptarDto { IdConductor = Pasajero }, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(resultado.Result);
        Assert.Empty(_notificador.Publicados);
    }

    // ---- Un fallo al publicar no afecta a la operación ----

    private sealed class HubQueFalla : IHubContext<TiempoRealHub, ITiempoRealCliente>
    {
        public IHubClients<ITiempoRealCliente> Clients => throw new InvalidOperationException("Hub caído");
        public IGroupManager Groups => throw new InvalidOperationException("Hub caído");
    }

    [Fact]
    public async Task SiElHubFallaElMensajeSeGuardaYLaRespuestaEsLaDeSiempre()
    {
        await using var context = await ContextoConUsuarios();
        var notificador = new NotificadorTiempoReal(new HubQueFalla(), NullLogger<NotificadorTiempoReal>.Instance);

        var resultado = await new MensajesController(context, notificador).PostMensaje(
            new MensajeCreateDTO { IdEmisor = Pasajero, IdReceptor = Conductor, Contenido = "hola" });

        var creado = Assert.IsType<CreatedAtActionResult>(resultado.Result);
        Assert.Equal("hola", Assert.IsType<MensajeDTO>(creado.Value).Contenido);
        Assert.Single(context.Mensajes);
    }
}
