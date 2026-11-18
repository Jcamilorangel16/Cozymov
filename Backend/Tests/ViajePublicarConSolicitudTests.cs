using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class ViajePublicarConSolicitudTests
{
    private static Usuarios NuevoUsuario(int id) => new()
    {
        IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
        PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
        Contrasena = "x", rol = "ambos", ocupacion = "Estudiante"
    };

    private static async Task<AppDbContext> ContextoConSolicitudPendiente()
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
        context.Usuarios.Add(NuevoUsuario(1));
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = 1 });
        context.Rutas.Add(new Ruta { IdRuta = 1, Origen = "CENTRO", Destino = "UPC" });
        context.Solicitudes.Add(new Solicitud
        {
            IdSolicitud = 10, IdUsuario = 1, IdRuta = 1, Estado = Solicitud.EstadoPendiente,
            FechaHora = DateTime.SpecifyKind(DateTime.Now.AddHours(1), DateTimeKind.Unspecified)
        });
        await context.SaveChangesAsync();
        return context;
    }

    [Fact]
    public async Task NoPermitePublicarViajeConUnaSolicitudPendiente()
    {
        await using var context = await ContextoConSolicitudPendiente();

        var resultado = await new ViajesController(context).PostViaje(new ViajeCreateDTO
        {
            IdUsuario = 1, Origen = "A", Destino = "B", FechaHoraSalida = DateTime.Now.AddHours(2),
            Costo = 3000, CuposDisponibles = 2, Estado = "Activo"
        }, CancellationToken.None);

        var conflicto = Assert.IsType<ConflictObjectResult>(resultado.Result);
        Assert.Contains("solicitud de viaje pendiente", conflicto.Value!.ToString());
        Assert.Empty(context.Viajes);
    }
}
