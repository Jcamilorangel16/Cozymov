using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class NuevosControladoresTests
{
    private static AppDbContext NewContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static async Task<AppDbContext> ContextoConReserva()
    {
        var context = NewContext();
        context.Usuarios.AddRange(NuevoUsuario(1), NuevoUsuario(2), NuevoUsuario(3));
        context.Viajes.Add(new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "disponible" });
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = 2, Estado = "completada" });
        await context.SaveChangesAsync();
        return context;
    }

    [Fact]
    public async Task CalificacionAceptaPasajeroYConductorDeLaReserva()
    {
        await using var context = await ContextoConReserva();
        var controller = new CalificacionesController(context);

        var result = await controller.PostCalificacion(new CalificacionCreateDto
        {
            IdReserva = 20, IdEvaluador = 2, IdEvaluado = 1, Puntuacion = 5
        });

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }

    [Fact]
    public async Task CalificacionRechazaTerceroAjenoALaReserva()
    {
        await using var context = await ContextoConReserva();
        var controller = new CalificacionesController(context);

        var result = await controller.PostCalificacion(new CalificacionCreateDto
        {
            IdReserva = 20, IdEvaluador = 3, IdEvaluado = 1, Puntuacion = 4
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CalificacionDuplicadaDelMismoEvaluadorDevuelveConflicto()
    {
        await using var context = await ContextoConReserva();
        var controller = new CalificacionesController(context);
        var dto = new CalificacionCreateDto { IdReserva = 20, IdEvaluador = 2, IdEvaluado = 1, Puntuacion = 3 };

        await controller.PostCalificacion(dto);
        var segundo = await controller.PostCalificacion(dto);

        Assert.IsType<ConflictObjectResult>(segundo.Result);
    }

    [Fact]
    public async Task PreferenciaPutCreaYLuegoActualiza()
    {
        await using var context = await ContextoConReserva();
        var controller = new PreferenciasController(context);

        await controller.PutPreferencia(1, new PreferenciaUpsertDto { PrioridadCosto = 2 });
        await controller.PutPreferencia(1, new PreferenciaUpsertDto { PrioridadCosto = 5, PreferirCompartir = true });

        var guardada = await context.Preferencias.SingleAsync();
        Assert.Equal((short)5, guardada.PrioridadCosto);
        Assert.True(guardada.PreferirCompartir);
    }

    [Fact]
    public async Task TelefonoDuplicadoDelMismoUsuarioDevuelveConflicto()
    {
        await using var context = await ContextoConReserva();
        var controller = new TelefonosController(context);
        var dto = new TelefonoUsuarioCreateDto { IdUsuario = 1, Telefono = "3001234567" };

        Assert.IsType<CreatedAtActionResult>((await controller.PostTelefono(dto)).Result);
        Assert.IsType<ConflictObjectResult>((await controller.PostTelefono(dto)).Result);
    }

    [Fact]
    public async Task SolicitudRechazaRutaInexistente()
    {
        await using var context = await ContextoConReserva();
        var controller = new SolicitudesController(context);

        var result = await controller.PostSolicitud(new SolicitudCreateDto
        {
            IdUsuario = 1, IdRuta = 999, FechaHora = DateTime.Now
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CalificacionRechazaReservaAunActiva()
    {
        await using var context = await ContextoConReserva();
        (await context.ReservasViaje.FindAsync(20L))!.Estado = "activa";
        await context.SaveChangesAsync();
        var controller = new CalificacionesController(context);

        var result = await controller.PostCalificacion(new CalificacionCreateDto
        {
            IdReserva = 20, IdEvaluador = 2, IdEvaluado = 1, Puntuacion = 5
        });

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task FinalizarReservaActivaLaMarcaCompletadaYApareceEnCompletadas()
    {
        await using var context = await ContextoConReserva();
        (await context.ReservasViaje.FindAsync(20L))!.Estado = "activa";
        await context.SaveChangesAsync();
        var controller = new ViajesController(context);

        var finalizar = await controller.FinalizarReservaActiva(2, CancellationToken.None);
        Assert.IsType<OkObjectResult>(finalizar);
        Assert.Equal("completada", (await context.ReservasViaje.FindAsync(20L))!.Estado);

        Assert.IsType<NotFoundObjectResult>(await controller.FinalizarReservaActiva(2, CancellationToken.None));
    }
}
