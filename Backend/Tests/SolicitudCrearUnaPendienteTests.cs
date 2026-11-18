using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class SolicitudCrearUnaPendienteTests
{
    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static async Task<AppDbContext> Contexto(params Solicitud[] existentes)
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Usuarios.AddRange(NuevoUsuario(1), NuevoUsuario(2));
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Solicitudes.AddRange(existentes);
        await context.SaveChangesAsync();
        return context;
    }

    private static Solicitud Existente(long id, int idUsuario, string estado) => new()
    {
        IdSolicitud = id, IdUsuario = idUsuario, IdRuta = 1, Estado = estado,
        FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified)
    };

    private static Task<ActionResult<SolicitudDto>> Crear(AppDbContext context, int idUsuario) =>
        new SolicitudesController(context).PostSolicitud(new SolicitudCreateDto
        {
            IdUsuario = idUsuario, Origen = "LOS ALAMOS", Destino = "UPC",
            FechaHora = DateTime.Now.AddHours(2), Presupuesto = 3500
        });

    [Fact]
    public async Task NoPermiteUnaSegundaSolicitudPendiente()
    {
        await using var context = await Contexto(Existente(10, 1, Solicitud.EstadoPendiente));

        var resultado = await Crear(context, 1);

        var conflicto = Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.Contains("pendiente", conflicto.Value!.ToString());
        Assert.Equal(1, await context.Solicitudes.CountAsync(s => s.IdUsuario == 1));
    }

    [Fact]
    public async Task PermitePedirOtraCuandoLaAnteriorYaFueAceptada()
    {
        await using var context = await Contexto(Existente(10, 1, Solicitud.EstadoAceptada));

        var resultado = await Crear(context, 1);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
        Assert.Equal(2, await context.Solicitudes.CountAsync(s => s.IdUsuario == 1));
    }

    [Fact]
    public async Task PermitePedirOtraDespuesDeEliminarLaPendiente()
    {
        await using var context = await Contexto(Existente(10, 1, Solicitud.EstadoPendiente));
        await new SolicitudesController(context).DeleteSolicitud(10);

        var resultado = await Crear(context, 1);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
    }

    [Fact]
    public async Task LaPendienteDeOtroPasajeroNoBloquea()
    {
        await using var context = await Contexto(Existente(10, 2, Solicitud.EstadoPendiente));

        var resultado = await Crear(context, 1);

        Assert.IsType<CreatedAtActionResult>(resultado.Result);
    }
}
