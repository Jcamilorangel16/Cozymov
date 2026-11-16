using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public sealed class ConfiguracionControllersTests
{
    private static AppDbContext NewContext() => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static Usuarios NuevoUsuario(int id, IPasswordHasher<Usuarios> hasher)
    {
        var usuario = new Usuarios
        {
            IdPersonas = id, Cedula = id.ToString(), PrimerNombre = "N", SegundoNombre = "",
            PrimerApellido = "A", SegundoApellido = "", Correo = $"{id}@x.co",
            rol = "ambos", ocupacion = "Estudiante"
        };
        usuario.Contrasena = hasher.HashPassword(usuario, "ClaveActual1");
        return usuario;
    }

    private static async Task<(AppDbContext Context, PasswordHasher<Usuarios> Hasher)> ContextoConUsuario()
    {
        var context = NewContext();
        var hasher = new PasswordHasher<Usuarios>();
        context.Usuarios.AddRange(NuevoUsuario(1, hasher), NuevoUsuario(2, hasher));
        await context.SaveChangesAsync();
        return (context, hasher);
    }

    private static UsuariosController Controlador(AppDbContext context, IPasswordHasher<Usuarios> hasher) =>
        new(context, hasher, null!);

    [Fact]
    public async Task CambiarContrasenaRechazaContrasenaActualIncorrecta()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;
        var hashAntes = (await context.Usuarios.FindAsync(1))!.Contrasena;

        var result = await Controlador(context, hasher).CambiarContrasena(1, new CambiarContrasenaDTO
        {
            ContrasenaActual = "Incorrecta1", NuevaContrasena = "ClaveNueva2"
        });

        Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(hashAntes, (await context.Usuarios.FindAsync(1))!.Contrasena);
    }

    [Fact]
    public async Task CambiarContrasenaGuardaElNuevoHashConContrasenaActualCorrecta()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;

        var result = await Controlador(context, hasher).CambiarContrasena(1, new CambiarContrasenaDTO
        {
            ContrasenaActual = "ClaveActual1", NuevaContrasena = "ClaveNueva2"
        });

        Assert.IsType<NoContentResult>(result);
        var usuario = (await context.Usuarios.FindAsync(1))!;
        Assert.NotEqual("ClaveNueva2", usuario.Contrasena);
        Assert.NotEqual(PasswordVerificationResult.Failed,
            hasher.VerifyHashedPassword(usuario, usuario.Contrasena, "ClaveNueva2"));
        Assert.Equal(PasswordVerificationResult.Failed,
            hasher.VerifyHashedPassword(usuario, usuario.Contrasena, "ClaveActual1"));
    }

    [Theory]
    [InlineData("corta1")]
    [InlineData("ñ123456789012345678901234567890123456789012345678901234567890123456789999")]
    public async Task CambiarContrasenaRechazaNuevaContrasenaFueraDePolitica(string nueva)
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;

        var result = await Controlador(context, hasher).CambiarContrasena(1, new CambiarContrasenaDTO
        {
            ContrasenaActual = "ClaveActual1", NuevaContrasena = nueva
        });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CambiarContrasenaDevuelve404ConUsuarioInexistente()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;

        var result = await Controlador(context, hasher).CambiarContrasena(99, new CambiarContrasenaDTO
        {
            ContrasenaActual = "ClaveActual1", NuevaContrasena = "ClaveNueva2"
        });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    private static async Task<AppDbContext> ContextoConVehiculo()
    {
        var context = NewContext();
        var hasher = new PasswordHasher<Usuarios>();
        context.Usuarios.AddRange(NuevoUsuario(1, hasher), NuevoUsuario(2, hasher));
        context.Vehiculos.Add(new Vehiculo { IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = 1 });
        context.Automoviles.Add(new Automovil { IdVehiculo = 5, NumeroPuertas = 4 });
        await context.SaveChangesAsync();
        return context;
    }

    [Fact]
    public async Task PutVehiculoActualizaDatosYDetalleSinReasignarPropietario()
    {
        await using var context = await ContextoConVehiculo();

        var result = await new VehiculoesController(context).PutVehiculo(5, new VehiculoUpdateDto
        {
            Tipo = "Automovil", Modelo = "Kia Picanto", Capacidad = 2, Foto = "f.png", NumeroPuertas = 5
        });

        Assert.IsType<NoContentResult>(result);
        var vehiculo = await context.Vehiculos.Include(v => v.Automovil).FirstAsync(v => v.IdVehiculo == 5);
        Assert.Equal("Kia Picanto", vehiculo.Modelo);
        Assert.Equal(2, vehiculo.Capacidad);
        Assert.Equal((short)5, vehiculo.Automovil!.NumeroPuertas);
        Assert.Equal(1, vehiculo.IdUsuario);
    }

    [Fact]
    public async Task PutVehiculoConservaDetalleCuandoNoSeEnvia()
    {
        await using var context = await ContextoConVehiculo();

        await new VehiculoesController(context).PutVehiculo(5, new VehiculoUpdateDto
        {
            Tipo = "Automovil", Modelo = "Mazda 3", Capacidad = 3
        });

        Assert.Equal((short)4, (await context.Automoviles.FindAsync(5L))!.NumeroPuertas);
    }

    [Fact]
    public async Task PutVehiculoRechazaCambiarElTipo()
    {
        await using var context = await ContextoConVehiculo();

        var result = await new VehiculoesController(context).PutVehiculo(5, new VehiculoUpdateDto
        {
            Tipo = "Moto", Modelo = "X", Capacidad = 1, Modalidad = "urbana"
        });

        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Automovil", (await context.Vehiculos.FindAsync(5L))!.Tipo);
    }

    [Fact]
    public async Task PutVehiculoDevuelve404SiNoExiste()
    {
        await using var context = await ContextoConVehiculo();

        var result = await new VehiculoesController(context).PutVehiculo(404, new VehiculoUpdateDto
        {
            Tipo = "Automovil", Modelo = "X", Capacidad = 1
        });

        Assert.IsType<NotFoundResult>(result);
    }
}
