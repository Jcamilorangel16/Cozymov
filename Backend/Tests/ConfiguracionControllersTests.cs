using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Hosting.Internal;

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

    private static UsuariosController Controlador(
        AppDbContext context,
        IPasswordHasher<Usuarios> hasher,
        LimitadorIntentos? limitador = null) =>
        new(context, hasher, limitador ?? new LimitadorIntentos(TimeProvider.System));

    private static int? Estado<T>(ActionResult<T> respuesta) =>
        (respuesta.Result as ObjectResult)?.StatusCode;

    [Fact]
    public async Task LoginBloqueaLaCuentaTrasDemasiadosFallosAunqueLaClaveSeaCorrecta()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;
        var controlador = Controlador(context, hasher);

        for (var intento = 0; intento < LimitadorIntentos.MaximoIntentos; intento++)
        {
            var fallo = await controlador.Login(new UsuariosLoginDTO { Correo = "1@x.co", Contrasena = "Incorrecta1" });
            Assert.Equal(StatusCodes.Status401Unauthorized, Estado(fallo));
        }

        var bloqueado = await controlador.Login(new UsuariosLoginDTO { Correo = "1@x.co", Contrasena = "ClaveActual1" });
        Assert.Equal(StatusCodes.Status429TooManyRequests, Estado(bloqueado));

        // El bloqueo es por cuenta: otro usuario sigue entrando con normalidad.
        var otro = await controlador.Login(new UsuariosLoginDTO { Correo = "2@x.co", Contrasena = "ClaveActual1" });
        Assert.Equal(StatusCodes.Status200OK, Estado(otro));
    }

    [Fact]
    public async Task LoginCorrectoReiniciaElContadorDeFallos()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;
        var controlador = Controlador(context, hasher);

        for (var ronda = 0; ronda < 3; ronda++)
        {
            for (var intento = 0; intento < LimitadorIntentos.MaximoIntentos - 1; intento++)
            {
                await controlador.Login(new UsuariosLoginDTO { Correo = "1@x.co", Contrasena = "Incorrecta1" });
            }

            var correcto = await controlador.Login(new UsuariosLoginDTO { Correo = "1@x.co", Contrasena = "ClaveActual1" });
            Assert.Equal(StatusCodes.Status200OK, Estado(correcto));
        }
    }

    [Fact]
    public async Task LoginRespondeIgualParaCorreosInexistentesYTambienLosBloquea()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;
        var controlador = Controlador(context, hasher);

        for (var intento = 0; intento < LimitadorIntentos.MaximoIntentos; intento++)
        {
            var fallo = await controlador.Login(new UsuariosLoginDTO { Correo = "nadie@x.co", Contrasena = "Cualquiera1" });
            Assert.Equal(StatusCodes.Status401Unauthorized, Estado(fallo));
        }

        var bloqueado = await controlador.Login(new UsuariosLoginDTO { Correo = "nadie@x.co", Contrasena = "Cualquiera1" });
        Assert.Equal(StatusCodes.Status429TooManyRequests, Estado(bloqueado));
    }

    [Fact]
    public async Task CambiarContrasenaSeBloqueaTrasDemasiadosFallos()
    {
        var (context, hasher) = await ContextoConUsuario();
        await using var _ = context;
        var controlador = Controlador(context, hasher);

        for (var intento = 0; intento < LimitadorIntentos.MaximoIntentos; intento++)
        {
            var fallo = await controlador.CambiarContrasena(1, new CambiarContrasenaDTO
            {
                ContrasenaActual = "Incorrecta1", NuevaContrasena = "ClaveNueva2"
            });
            Assert.IsType<UnauthorizedObjectResult>(fallo);
        }

        var bloqueado = await controlador.CambiarContrasena(1, new CambiarContrasenaDTO
        {
            ContrasenaActual = "ClaveActual1", NuevaContrasena = "ClaveNueva2"
        });

        Assert.Equal(StatusCodes.Status429TooManyRequests, (bloqueado as ObjectResult)?.StatusCode);
        var verificacion = hasher.VerifyHashedPassword(
            null!, (await context.Usuarios.FindAsync(1))!.Contrasena, "ClaveActual1");
        Assert.NotEqual(PasswordVerificationResult.Failed, verificacion);
    }

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

    private static UsuariosController ControladorRegistro(AppDbContext context, string entorno)
    {
        var servicios = new ServiceCollection()
            .AddSingleton<IHostEnvironment>(new HostingEnvironment { EnvironmentName = entorno })
            .BuildServiceProvider();
        var controlador = Controlador(context, new PasswordHasher<Usuarios>());
        controlador.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { RequestServices = servicios }
        };
        return controlador;
    }

    private static UsuariosCreateDTO NuevoRegistro(string correo) => new()
    {
        Cedula = "777", PrimerNombre = "Nueva", SegundoNombre = "", PrimerApellido = "Persona",
        SegundoApellido = "", Edad = 20, Correo = correo, Contrasena = "ClaveSegura1",
        rol = "usuario", ocupacion = "Estudiante"
    };

    [Fact]
    public async Task RegistroCreaLaCuentaSinCodigoDeVerificacion()
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .PostUsuarios(NuevoRegistro(" Nueva@Uni.EDU.co "), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(result.Result);
        var usuario = await context.Usuarios.SingleAsync();
        Assert.Equal("nueva@uni.edu.co", usuario.Correo);
        Assert.NotEqual("ClaveSegura1", usuario.Contrasena);
    }

    [Fact]
    public async Task RegistroRechazaCorreoNoInstitucionalFueraDeDevelopment()
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .PostUsuarios(NuevoRegistro("nueva@gmail.com"), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False(await context.Usuarios.AnyAsync());
    }

    private static UsuariosRegistroGoogleDTO NuevoRegistroGoogle(
        string correo = "nueva@unicesar.edu.co",
        string sub = "sub-google-1",
        string cedula = "888",
        bool verificado = true,
        string contrasena = "ClaveGoogle1") => new()
    {
        Sub = sub, Correo = correo, EmailVerificado = verificado, Cedula = cedula,
        PrimerNombre = " Nueva ", SegundoNombre = null, PrimerApellido = "Persona",
        SegundoApellido = null, Edad = 20, Ocupacion = "Estudiante", Contrasena = contrasena
    };

    [Fact]
    public async Task RegistroGoogleCreaLaCuentaVinculadaYLuegoEntraConGoogle()
    {
        await using var context = NewContext();
        var controlador = ControladorRegistro(context, "Production");

        var result = await controlador.RegistroGoogle(
            NuevoRegistroGoogle(correo: " Nueva@Unicesar.EDU.co "), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(result.Result);
        var usuario = await context.Usuarios.SingleAsync();
        Assert.Equal("nueva@unicesar.edu.co", usuario.Correo);
        Assert.Equal("Nueva", usuario.PrimerNombre);
        Assert.Equal("", usuario.SegundoNombre);
        Assert.Equal("usuario", usuario.rol);
        Assert.NotEqual("ClaveGoogle1", usuario.Contrasena);
        var identidad = await context.IdentidadesExternas.SingleAsync();
        Assert.Equal(("google", "sub-google-1", usuario.IdPersonas),
            (identidad.Proveedor, identidad.Sub, identidad.IdUsuario));

        var login = await controlador.LoginGoogle(new UsuariosLoginGoogleDTO
        {
            Sub = "sub-google-1", Correo = "nueva@unicesar.edu.co", EmailVerificado = true
        }, CancellationToken.None);
        var dto = Assert.IsType<UsuariosDTO>(Assert.IsType<OkObjectResult>(login.Result).Value);
        Assert.Equal(usuario.IdPersonas, dto.IdPersonas);

        // La contraseña creada en el registro también sirve para el login normal.
        var conContrasena = await controlador.Login(new UsuariosLoginDTO
        {
            Correo = "nueva@unicesar.edu.co", Contrasena = "ClaveGoogle1"
        });
        Assert.Equal(StatusCodes.Status200OK, Estado(conContrasena));
    }

    [Theory]
    [InlineData("")]
    [InlineData("corta12")]
    public async Task RegistroGoogleExigeUnaContrasenaValida(string contrasena)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .RegistroGoogle(NuevoRegistroGoogle(contrasena: contrasena), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False(await context.Usuarios.AnyAsync());
        Assert.False(await context.IdentidadesExternas.AnyAsync());
    }

    [Theory]
    [InlineData("Production", "nueva@otra.edu.co")]
    [InlineData("Production", "nueva@est.unicesar.edu.co")]
    [InlineData("Production", "nueva@unicesar.edu.co.otro.com")]
    [InlineData("Development", "nueva@gmail.com")]
    [InlineData("Development", "nueva@otra.edu.co")]
    public async Task RegistroGoogleSoloAdmiteCorreosUnicesarEnCualquierEntorno(string entorno, string correo)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, entorno)
            .RegistroGoogle(NuevoRegistroGoogle(correo: correo), CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Estado(result));
        Assert.False(await context.Usuarios.AnyAsync());
        Assert.False(await context.IdentidadesExternas.AnyAsync());
    }

    [Fact]
    public async Task RegistroGoogleRechazaCorreoNoVerificadoPorGoogle()
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .RegistroGoogle(NuevoRegistroGoogle(verificado: false), CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Estado(result));
        Assert.False(await context.Usuarios.AnyAsync());
    }

    [Theory]
    [InlineData("otra@unicesar.edu.co", "sub-google-1", "999")]
    [InlineData("nueva@unicesar.edu.co", "sub-google-2", "999")]
    [InlineData("otra@unicesar.edu.co", "sub-google-2", "888")]
    public async Task RegistroGoogleRechazaCuentaGoogleCorreoOCedulaYaRegistrados(
        string correo, string sub, string cedula)
    {
        await using var context = NewContext();
        var controlador = ControladorRegistro(context, "Production");
        await controlador.RegistroGoogle(NuevoRegistroGoogle(), CancellationToken.None);

        var result = await controlador.RegistroGoogle(
            NuevoRegistroGoogle(correo: correo, sub: sub, cedula: cedula), CancellationToken.None);

        Assert.Equal(StatusCodes.Status409Conflict, Estado(result));
        Assert.Equal(1, await context.Usuarios.CountAsync());
        Assert.Equal(1, await context.IdentidadesExternas.CountAsync());
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
            Tipo = "Automovil", Modelo = "Kia Picanto", Capacidad = 2, NumeroPuertas = 5
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
