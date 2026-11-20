using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class SolicitudAceptarViajePublicadoTests
{
    private const int Conductor = 1;
    private const int Pasajero = 2;

    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    /// <summary>Conductor con vehículo y una solicitud pendiente de otro usuario.</summary>
    private static async Task<AppDbContext> ContextoBase()
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Usuarios.AddRange(NuevoUsuario(Conductor), NuevoUsuario(Pasajero), NuevoUsuario(3));
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = Conductor });
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Solicitudes.Add(new Solicitud
        {
            IdSolicitud = 100, IdUsuario = Pasajero, IdRuta = 1,
            FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
            Presupuesto = 3500, Estado = Solicitud.EstadoPendiente
        });
        await context.SaveChangesAsync();
        return context;
    }

    private static Viaje Publicado(long id) => new()
    {
        IdViaje = id, IdUsuario = Conductor, IdRuta = 1, Origen = "A", Destino = "B",
        FechaHoraSalida = DateTime.SpecifyKind(DateTime.Now.AddHours(2), DateTimeKind.Unspecified),
        Costo = 3000, CuposDisponibles = 2, Estado = "Activo"
    };

    private static Task<ActionResult<ReservaViajeDTO>> Aceptar(AppDbContext context) =>
        new SolicitudesController(context).AceptarSolicitud(
            100, new SolicitudAceptarDto { IdConductor = Conductor }, CancellationToken.None);

    [Fact]
    public async Task AceptarEliminaElViajePublicadoSinReservas()
    {
        await using var context = await ContextoBase();
        context.Viajes.Add(Publicado(10));
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<OkObjectResult>(resultado.Result);
        Assert.Null(await context.Viajes.FindAsync(10L));
        // Queda solo el viaje privado de la solicitud aceptada.
        var restantes = await context.Viajes.Where(v => v.IdUsuario == Conductor).ToListAsync();
        Assert.Single(restantes);
        Assert.Equal("privado", restantes[0].Estado);
    }

    [Fact]
    public async Task AceptarCancelaSinBorrarElViajePublicadoConHistorial()
    {
        await using var context = await ContextoBase();
        context.Viajes.Add(Publicado(10));
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = 3, Estado = "completada" });
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<OkObjectResult>(resultado.Result);
        var viaje = await context.Viajes.FindAsync(10L);
        Assert.NotNull(viaje);
        Assert.Equal("cancelado", viaje!.Estado);
        // El historial (y sus calificaciones) se conserva.
        Assert.NotNull(await context.ReservasViaje.FindAsync(20L));
    }

    [Fact]
    public async Task AceptarSeRechazaSiElViajePublicadoTienePasajerosActivos()
    {
        await using var context = await ContextoBase();
        context.Viajes.Add(Publicado(10));
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = 3, Estado = "activa" });
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.Equal("Activo", (await context.Viajes.FindAsync(10L))!.Estado);
        Assert.Equal(Solicitud.EstadoPendiente, (await context.Solicitudes.FindAsync(100L))!.Estado);
    }

    [Fact]
    public async Task AceptarSinViajePublicadoNoTocaViajesAjenos()
    {
        await using var context = await ContextoBase();
        context.Viajes.Add(new Viaje
        {
            IdViaje = 11, IdUsuario = 3, IdRuta = 1, Origen = "A", Destino = "B",
            FechaHoraSalida = DateTime.SpecifyKind(DateTime.Now.AddHours(2), DateTimeKind.Unspecified),
            Costo = 3000, CuposDisponibles = 2, Estado = "Activo"
        });
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<OkObjectResult>(resultado.Result);
        Assert.Equal("Activo", (await context.Viajes.FindAsync(11L))!.Estado);
    }

    [Fact]
    public async Task AceptarEliminaLaSolicitudPendienteDelConductor()
    {
        await using var context = await ContextoBase();
        context.Solicitudes.AddRange(
            new Solicitud
            {
                IdSolicitud = 101, IdUsuario = Conductor, IdRuta = 1,
                FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
                Estado = Solicitud.EstadoPendiente
            },
            new Solicitud
            {
                IdSolicitud = 102, IdUsuario = 3, IdRuta = 1,
                FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
                Estado = Solicitud.EstadoPendiente
            });
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<OkObjectResult>(resultado.Result);
        Assert.Null(await context.Solicitudes.FindAsync(101L));
        // La aceptada y las de otros usuarios se conservan.
        Assert.Equal(Solicitud.EstadoAceptada, (await context.Solicitudes.FindAsync(100L))!.Estado);
        Assert.NotNull(await context.Solicitudes.FindAsync(102L));
    }

    [Fact]
    public async Task AceptarRechazadoNoEliminaLaSolicitudDelConductor()
    {
        await using var context = await ContextoBase();
        context.Solicitudes.Add(new Solicitud
        {
            IdSolicitud = 101, IdUsuario = Conductor, IdRuta = 1,
            FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified),
            Estado = Solicitud.EstadoPendiente
        });
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 99, IdPasajero = Conductor, Estado = "activa" });
        await context.SaveChangesAsync();

        var resultado = await Aceptar(context);

        Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.NotNull(await context.Solicitudes.FindAsync(101L));
    }
}
