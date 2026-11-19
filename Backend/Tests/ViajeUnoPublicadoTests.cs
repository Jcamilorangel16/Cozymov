using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class ViajeUnoPublicadoTests
{
    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static Viaje Viaje(long id, int idUsuario, string estado, int cupos) => new()
    {
        IdViaje = id, IdUsuario = idUsuario, Origen = "A", Destino = "B",
        FechaHoraSalida = DateTime.SpecifyKind(DateTime.Now.AddHours(2), DateTimeKind.Unspecified),
        Costo = 3000, CuposDisponibles = cupos, Estado = estado
    };

    private static async Task<AppDbContext> Contexto(params Viaje[] viajes)
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Usuarios.AddRange(NuevoUsuario(1), NuevoUsuario(2));
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = 1 });
        context.Viajes.AddRange(viajes);
        await context.SaveChangesAsync();
        return context;
    }

    private static Task<ActionResult<ViajeDTO>> Publicar(AppDbContext context) =>
        new ViajesController(context).PostViaje(new ViajeCreateDTO
        {
            IdUsuario = 1, Origen = "C", Destino = "D", FechaHoraSalida = DateTime.Now.AddHours(3),
            Costo = 3000, CuposDisponibles = 2, Estado = "Activo"
        }, CancellationToken.None);

    [Theory]
    [InlineData("Activo", 2)]
    [InlineData("activo", 2)]
    [InlineData("Activo", 0)] // lleno: sigue siendo su viaje publicado
    public async Task NoPermitePublicarUnSegundoViaje(string estado, int cupos)
    {
        await using var context = await Contexto(Viaje(10, 1, estado, cupos));

        var resultado = await Publicar(context);

        var conflicto = Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.Contains("Solo puedes actualizarlo", conflicto.Value!.ToString());
        Assert.Single(context.Viajes);
    }

    [Fact]
    public async Task ElViajePublicadoSePuedeActualizar()
    {
        await using var context = await Contexto(Viaje(10, 1, "Activo", 2));

        var resultado = await new ViajesController(context).PutViaje(10, new ViajeCreateDTO
        {
            IdUsuario = 1, Origen = "A", Destino = "B", PuntoEncuentro = "Parque nuevo",
            FechaHoraSalida = DateTime.Now.AddHours(4), Costo = 4500, CuposDisponibles = 3, Estado = "Activo"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(resultado);
        var viaje = await context.Viajes.FindAsync(10L);
        Assert.Equal(4500, viaje!.Costo);
        Assert.Equal("Parque nuevo", viaje.PuntoEncuentro);
        Assert.Single(context.Viajes);
    }

    [Fact]
    public async Task ElViajeLlenoSigueApareciendoEnLosViajesDelUsuarioPeroNoEnLaBusquedaPublica()
    {
        await using var context = await Contexto(Viaje(10, 1, "Activo", 0));
        var controller = new ViajesController(context);

        var delUsuario = await controller.GetViajes(null, null, null, 1, null, CancellationToken.None);
        var publica = await controller.GetViajes(null, null, null, null, null, CancellationToken.None);

        Assert.Single(delUsuario.Value!);
        Assert.Empty(publica.Value!);
    }
}
