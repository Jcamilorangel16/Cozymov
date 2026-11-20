using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class PerfilPublicoTests
{
    // JPEG mínimo: solo importa la firma FF D8 FF.
    private const string FotoJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";

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
    public async Task PerfilInexistenteDevuelve404()
    {
        await using var context = NewContext();

        var resultado = await new PerfilesController(context).GetPerfil(99);

        Assert.IsType<NotFoundResult>(resultado.Result);
    }

    [Fact]
    public async Task PutGuardaDescripcionYFotoYLuegoLasQuita()
    {
        await using var context = await ContextoConHistorial();
        var controller = new PerfilesController(context);

        var guardar = await controller.PutPerfil(1, new PerfilPublicoUpdateDto
        {
            Descripcion = "  Viajo a la U todos los días  ", FotoPerfil = FotoJpeg
        });
        Assert.IsType<NoContentResult>(guardar);
        var usuario = await context.Usuarios.FindAsync(1);
        Assert.Equal("Viajo a la U todos los días", usuario!.Descripcion);
        Assert.Equal(FotoJpeg, usuario.FotoPerfil);

        await controller.PutPerfil(1, new PerfilPublicoUpdateDto { Descripcion = " ", FotoPerfil = null });
        Assert.Null(usuario.Descripcion);
        Assert.Null(usuario.FotoPerfil);
    }

    [Theory]
    [InlineData("https://ejemplo.com/foto.png")]
    [InlineData("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")]
    // Declara PNG pero el contenido es JPEG.
    [InlineData("data:image/png;base64,/9j/4AAQSkZJRgABAQ==")]
    [InlineData("data:image/jpeg;base64,no-es-base64!")]
    public async Task PutRechazaFotosNoValidas(string foto)
    {
        await using var context = await ContextoConHistorial();

        var resultado = await new PerfilesController(context)
            .PutPerfil(1, new PerfilPublicoUpdateDto { FotoPerfil = foto });

        Assert.IsType<BadRequestObjectResult>(resultado);
        Assert.Null((await context.Usuarios.FindAsync(1))!.FotoPerfil);
    }

    [Fact]
    public void FotoDemasiadoGrandeNoEsValida()
    {
        var foto = "data:image/jpeg;base64,/9j/" + new string('A', PerfilesController.MaximoLongitudFoto);

        Assert.False(PerfilesController.EsFotoValida(foto));
    }
}
