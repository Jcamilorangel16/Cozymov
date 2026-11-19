using Backend.Controllers;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace Backend.Tests;

public sealed class ViajeEnTrayectoTests
{
    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    /// <summary>Reserva activa del pasajero 2 en un viaje del conductor 1 con la salida indicada.</summary>
    private static async Task<AppDbContext> ContextoConReserva(TimeSpan salidaDesdeAhora)
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            // El proveedor en memoria no tiene transacciones: se ignora el aviso para poder
            // ejecutar el cancelar real.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options);
        context.Usuarios.AddRange(NuevoUsuario(1), NuevoUsuario(2));
        context.Viajes.Add(new Viaje
        {
            IdViaje = 10, IdUsuario = 1, Origen = "A", Destino = "B", Costo = 3000,
            CuposDisponibles = 1, Estado = "Activo",
            // Hora local de Colombia (UTC-5), como se guarda en la base.
            FechaHoraSalida = DateTime.SpecifyKind(
                DateTime.UtcNow.AddHours(-5) + salidaDesdeAhora, DateTimeKind.Unspecified)
        });
        context.ReservasViaje.Add(new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = 2, Estado = "activa" });
        await context.SaveChangesAsync();
        return context;
    }

    [Theory]
    [InlineData(-1)]   // salió hace un minuto
    [InlineData(-120)] // salió hace dos horas
    public async Task ElPasajeroNoPuedeSalirseDeUnViajeEnTrayecto(int minutos)
    {
        await using var context = await ContextoConReserva(TimeSpan.FromMinutes(minutos));

        var resultado = await new ViajesController(context).CancelarReservaActiva(2, CancellationToken.None);

        var conflicto = Assert.IsType<ConflictObjectResult>(resultado);
        Assert.Contains("en trayecto", conflicto.Value!.ToString());
        Assert.Equal("activa", (await context.ReservasViaje.FindAsync(20L))!.Estado);
        Assert.Equal(1, (await context.Viajes.FindAsync(10L))!.CuposDisponibles);
    }

    [Fact]
    public async Task ElPasajeroPuedeSalirseAntesDeLaHoraDeSalida()
    {
        await using var context = await ContextoConReserva(TimeSpan.FromMinutes(30));

        var resultado = await new ViajesController(context).CancelarReservaActiva(2, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        Assert.Equal("cancelada", (await context.ReservasViaje.FindAsync(20L))!.Estado);
        Assert.Equal(2, (await context.Viajes.FindAsync(10L))!.CuposDisponibles);
    }

    [Fact]
    public async Task EnTrayectoElPasajeroSiPuedeFinalizarElViaje()
    {
        await using var context = await ContextoConReserva(TimeSpan.FromMinutes(-10));

        var resultado = await new ViajesController(context).FinalizarReservaActiva(2, CancellationToken.None);

        Assert.IsType<OkObjectResult>(resultado);
        Assert.Equal("completada", (await context.ReservasViaje.FindAsync(20L))!.Estado);
    }

    [Fact]
    public async Task SinReservaActivaSigueRespondiendoNoEncontrado()
    {
        await using var context = await ContextoConReserva(TimeSpan.FromMinutes(-10));

        var resultado = await new ViajesController(context).CancelarReservaActiva(1, CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(resultado);
    }
}
