using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class PerfilPublicoTests
{
    private static AppDbContext NewContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Usuarios NuevoUsuario(int id, string nombre) => new()
    {
        IdPersonas = id, Cedula = $"100{id}", PrimerNombre = nombre, SegundoNombre = "Segundo",
        PrimerApellido = "Pérez", SegundoApellido = "Gómez", Correo = $"{id}@unicesar.edu.co",
        Contrasena = "hash", rol = "ambos", ocupacion = "Estudiante", Edad = 21
    };

    private static async Task<AppDbContext> ContextoConHistorial()
    {
        var context = NewContext();
        context.Usuarios.AddRange(NuevoUsuario(1, "Ana"), NuevoUsuario(2, "Luis"), NuevoUsuario(3, "Eva"));
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, IdUsuario = 1, Tipo = "Moto", Modelo = "NKD", Capacidad = 1 });
        context.Viajes.AddRange(
            new Viaje { IdViaje = 10, IdUsuario = 1, Estado = "disponible" },
            new Viaje { IdViaje = 11, IdUsuario = 1, Estado = "disponible" });
        context.ReservasViaje.AddRange(
            new ReservaViaje { IdReserva = 20, IdViaje = 10, IdPasajero = 2, Estado = "completada" },
            new ReservaViaje { IdReserva = 21, IdViaje = 11, IdPasajero = 3, Estado = "completada" });
        context.Calificaciones.AddRange(
            new Calificacion { IdCalificacion = 30, IdReserva = 20, IdEvaluador = 2, IdEvaluado = 1, Puntuacion = 5, Comentario = "Puntual" },
            new Calificacion { IdCalificacion = 31, IdReserva = 21, IdEvaluador = 3, IdEvaluado = 1, Puntuacion = 4 });
        await context.SaveChangesAsync();
        return context;
    }

    [Fact]
    public async Task PerfilIncluyeResumenResenasYVehiculos()
    {
        await using var context = await ContextoConHistorial();

        var perfil = (await new PerfilesController(context).GetPerfil(1)).Value!;

        Assert.Equal("Ana Pérez", perfil.Nombre);
        Assert.Equal("Estudiante", perfil.Ocupacion);
        Assert.Equal(4.5, perfil.PromedioCalificacion);
        Assert.Equal(2, perfil.TotalCalificaciones);
        Assert.Equal(2, perfil.ViajesPublicados);
        Assert.Equal([31L, 30L], perfil.Resenas.Select(r => r.IdCalificacion));
        Assert.Equal("Puntual", perfil.Resenas[1].Comentario);
        Assert.Equal([new VehiculoPublicoDto("Moto", "NKD")], perfil.Vehiculos);
    }

    [Fact]
    public async Task PerfilCuentaViajesComoPasajeroYSinResenasNoTienePromedio()
    {
        await using var context = await ContextoConHistorial();

        var perfil = (await new PerfilesController(context).GetPerfil(2)).Value!;

        Assert.Equal(1, perfil.ViajesComoPasajero);
        Assert.Null(perfil.PromedioCalificacion);
        Assert.Empty(perfil.Resenas);
    }

    [Fact]
    public void PerfilPublicoNoExponeDatosPrivadosNiAutoresDeResenas()
    {
        var propiedades = typeof(PerfilPublicoDto).GetProperties().Select(p => p.Name)
            .Concat(typeof(ResenaPublicaDto).GetProperties().Select(p => p.Name))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var privada in new[] { "Cedula", "Correo", "Edad", "Telefono", "Contrasena", "IdEvaluador", "IdReserva" })
            Assert.DoesNotContain(privada, propiedades);
    }

    [Fact]
    public void UsuariosNoTieneColumnasQueMainNoDefine()
    {
        // El perfil público se adaptó al esquema de main: no añade columnas a Usuarios.
        var propiedades = typeof(Usuarios).GetProperties().Select(p => p.Name).ToHashSet();

        Assert.DoesNotContain("FotoPerfil", propiedades);
        Assert.DoesNotContain("Descripcion", propiedades);
    }

    [Fact]
    public async Task PerfilInexistenteDevuelve404()
    {
        await using var context = NewContext();

        var resultado = await new PerfilesController(context).GetPerfil(99);

        Assert.IsType<NotFoundResult>(resultado.Result);
    }
}
