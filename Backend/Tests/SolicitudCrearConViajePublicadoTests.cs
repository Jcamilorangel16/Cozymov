using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class SolicitudCrearConViajePublicadoTests
{
    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static async Task<AppDbContext> Contexto(params Viaje[] viajes)
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Usuarios.AddRange(NuevoUsuario(1), NuevoUsuario(2));
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Viajes.AddRange(viajes);
        await context.SaveChangesAsync();
        return context;
    }

    private static Task<ActionResult<SolicitudDto>> Crear(AppDbContext context, int idUsuario) =>
        new SolicitudesController(context).PostSolicitud(new SolicitudCreateDto
        {
            IdUsuario = idUsuario, Origen = "LOS ALAMOS", Destino = "UPC",
            FechaHora = DateTime.Now.AddHours(2), Presupuesto = 3500
        });

    [Fact]
    public async Task ConductorConViajePublicadoNoPuedeSolicitarViaje()
    {
        await using var context = await Contexto(new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "activo" });

        var resultado = await Crear(context, 1);

        var conflicto = Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.Contains("viaje publicado", conflicto.Value!.ToString());
        Assert.Equal(0, await context.Solicitudes.CountAsync());
    }

    [Fact]
    public async Task ElEstadoDelViajePublicadoNoDistingueMayusculas()
    {
        await using var context = await Contexto(new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "Activo" });

        var resultado = await Crear(context, 1);

        Assert.IsType<ConflictObjectResult>(resultado.Result);
    }

    [Fact]
    public async Task ViajesYaNoPublicadosNoBloqueanLaSolicitud()
    {
        await using var context = await Contexto(
            new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "cancelado" },
            new Viaje { IdViaje = 11, IdUsuario = 1, Estado = "privado" });

        var resultado = await Crear(context, 1);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
        Assert.Equal(1, await context.Solicitudes.CountAsync(s => s.IdUsuario == 1));
    }

    [Fact]
    public async Task ElViajePublicadoDeOtroUsuarioNoBloquea()
    {
        await using var context = await Contexto(new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "activo" });

        var resultado = await Crear(context, 2);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
    }
}
