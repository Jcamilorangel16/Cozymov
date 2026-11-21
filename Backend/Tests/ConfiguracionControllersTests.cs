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

    private static UsuariosCreateDTO NuevoRegistro(string correo, string? telefono = "3001234567") => new()
    {
        Cedula = "777", PrimerNombre = "Nueva", SegundoNombre = "", PrimerApellido = "Persona",
        SegundoApellido = "", Edad = 20, Correo = correo, Contrasena = "ClaveSegura1",
        rol = "usuario", ocupacion = "Estudiante", Telefono = telefono
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

    [Theory]
    [InlineData("3001234567")]
    [InlineData("300 123 4567")]
    [InlineData("+57 300-123-4567")]
    [InlineData("57 (300) 123.4567")]
    public async Task RegistroGuardaElCelularNormalizadoJuntoConLaCuenta(string telefono)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .PostUsuarios(NuevoRegistro("nueva@uni.edu.co", telefono), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(result.Result);
        var usuario = await context.Usuarios.SingleAsync();
        var guardado = await context.TelefonosUsuario.SingleAsync();
        Assert.Equal((usuario.IdPersonas, "+573001234567"), (guardado.IdUsuario, guardado.Telefono));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("6055712345")]   // fijo de Valledupar: no recibe SMS
    [InlineData("300123456")]    // 9 dígitos
    [InlineData("30012345678")]  // 11 dígitos
    [InlineData("+1 300 123 4567")]
    [InlineData("300123456a")]
    [InlineData("٣٠٠١٢٣٤٥٦٧")]   // dígitos arábigo-índicos
    public async Task RegistroExigeUnCelularColombianoValido(string? telefono)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .PostUsuarios(NuevoRegistro("nueva@uni.edu.co", telefono), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False(await context.Usuarios.AnyAsync());
        Assert.False(await context.TelefonosUsuario.AnyAsync());
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

    private const string SubMicrosoft =
        "11111111-2222-3333-4444-555555555555:aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

    private static async Task<AppDbContext> ContextoConCuentaInstitucional()
    {
        var context = NewContext();
        var usuario = NuevoUsuario(7, new PasswordHasher<Usuarios>());
        usuario.Correo = "Estudiante@Unicesar.edu.co";
        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync();
        return context;
    }

    [Fact]
    public async Task LoginMicrosoftVinculaLaCuentaPorCorreoYLuegoEntraPorSub()
    {
        await using var context = await ContextoConCuentaInstitucional();
        var controlador = ControladorRegistro(context, "Production");

        var primero = await controlador.LoginMicrosoft(new UsuariosLoginMicrosoftDTO
        {
            Sub = SubMicrosoft, Correo = " estudiante@unicesar.edu.co "
        }, CancellationToken.None);

        var dto = Assert.IsType<UsuariosDTO>(Assert.IsType<OkObjectResult>(primero.Result).Value);
        Assert.Equal(7, dto.IdPersonas);
        var identidad = await context.IdentidadesExternas.SingleAsync();
        Assert.Equal(("microsoft", SubMicrosoft, 7),
            (identidad.Proveedor, identidad.Sub, identidad.IdUsuario));

        // Con el vínculo creado, entra por la identidad aunque el correo cambie.
        var segundo = await controlador.LoginMicrosoft(new UsuariosLoginMicrosoftDTO
        {
            Sub = SubMicrosoft, Correo = "nuevo.alias@unicesar.edu.co"
        }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(segundo.Result);
        Assert.Equal(1, await context.IdentidadesExternas.CountAsync());
    }

    [Theory]
    [InlineData("estudiante@otra.edu.co")]
    [InlineData("estudiante@sub.unicesar.edu.co")]
    [InlineData("estudiante@unicesar.edu.co.evil.com")]
    public async Task LoginMicrosoftSoloVinculaCorreosUnicesarFueraDeDevelopment(string correo)
    {
        await using var context = await ContextoConCuentaInstitucional();
        context.Usuarios.Single().Correo = correo;
        await context.SaveChangesAsync();

        var result = await ControladorRegistro(context, "Production").LoginMicrosoft(
            new UsuariosLoginMicrosoftDTO { Sub = SubMicrosoft, Correo = correo },
            CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Estado(result));
        Assert.False(await context.IdentidadesExternas.AnyAsync());

        var enDesarrollo = await ControladorRegistro(context, "Development").LoginMicrosoft(
            new UsuariosLoginMicrosoftDTO { Sub = SubMicrosoft, Correo = correo },
            CancellationToken.None);
        Assert.IsType<OkObjectResult>(enDesarrollo.Result);
    }

    [Fact]
    public async Task LoginMicrosoftSinCuentaDevuelveNotFoundYNoCreaNada()
    {
        await using var context = await ContextoConCuentaInstitucional();

        var result = await ControladorRegistro(context, "Production").LoginMicrosoft(
            new UsuariosLoginMicrosoftDTO { Sub = SubMicrosoft, Correo = "otra@unicesar.edu.co" },
            CancellationToken.None);

        Assert.IsType<NotFoundObjectResult>(result.Result);
        Assert.Equal(1, await context.Usuarios.CountAsync());
        Assert.False(await context.IdentidadesExternas.AnyAsync());
    }

    [Theory]
    [InlineData("", "estudiante@unicesar.edu.co")]
    [InlineData(SubMicrosoft, "")]
    public async Task LoginMicrosoftRechazaIdentidadIncompleta(string sub, string correo)
    {
        await using var context = await ContextoConCuentaInstitucional();

        var result = await ControladorRegistro(context, "Production").LoginMicrosoft(
            new UsuariosLoginMicrosoftDTO { Sub = sub, Correo = correo },
            CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task LasIdentidadesDeGoogleYMicrosoftNoSeConfunden()
    {
        await using var context = await ContextoConCuentaInstitucional();
        var otro = NuevoUsuario(8, new PasswordHasher<Usuarios>());
        context.Usuarios.Add(otro);
        // El mismo valor de sub vinculado con Google a otra cuenta no afecta a Microsoft.
        context.IdentidadesExternas.Add(new IdentidadExterna
        {
            IdUsuario = 8, Proveedor = "google", Sub = SubMicrosoft
        });
        await context.SaveChangesAsync();

        var result = await ControladorRegistro(context, "Production").LoginMicrosoft(
            new UsuariosLoginMicrosoftDTO { Sub = SubMicrosoft, Correo = "estudiante@unicesar.edu.co" },
            CancellationToken.None);

        var dto = Assert.IsType<UsuariosDTO>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(7, dto.IdPersonas);
    }

    private static UsuariosRegistroMicrosoftDTO NuevoRegistroMicrosoft(
        string correo = "nueva@unicesar.edu.co",
        string sub = SubMicrosoft,
        string cedula = "999") => new()
    {
        Sub = sub, Correo = correo, Cedula = cedula,
        PrimerNombre = "Nueva", PrimerApellido = "Persona", Edad = 20,
        Ocupacion = "Estudiante", Contrasena = "ClaveMicrosoft1", Telefono = "3105550000"
    };

    [Fact]
    public async Task RegistroMicrosoftCreaLaCuentaVinculadaYLuegoEntraConMicrosoft()
    {
        await using var context = NewContext();
        var controlador = ControladorRegistro(context, "Production");

        var result = await controlador.RegistroMicrosoft(
            NuevoRegistroMicrosoft(correo: " Nueva@Unicesar.EDU.co "), CancellationToken.None);

        Assert.IsType<CreatedAtActionResult>(result.Result);
        var usuario = await context.Usuarios.SingleAsync();
        Assert.Equal("nueva@unicesar.edu.co", usuario.Correo);
        var identidad = await context.IdentidadesExternas.SingleAsync();
        Assert.Equal(("microsoft", SubMicrosoft, usuario.IdPersonas),
            (identidad.Proveedor, identidad.Sub, identidad.IdUsuario));
        Assert.Equal("+573105550000", (await context.TelefonosUsuario.SingleAsync()).Telefono);

        var login = await controlador.LoginMicrosoft(new UsuariosLoginMicrosoftDTO
        {
            Sub = SubMicrosoft, Correo = "nueva@unicesar.edu.co"
        }, CancellationToken.None);
        Assert.IsType<OkObjectResult>(login.Result);

        var conContrasena = await controlador.Login(new UsuariosLoginDTO
        {
            Correo = "nueva@unicesar.edu.co", Contrasena = "ClaveMicrosoft1"
        });
        Assert.Equal(StatusCodes.Status200OK, Estado(conContrasena));
    }

    [Theory]
    [InlineData("Production", "nueva@otra.edu.co")]
    [InlineData("Development", "nueva@outlook.com")]
    [InlineData("Development", "nueva@sub.unicesar.edu.co")]
    public async Task RegistroMicrosoftSoloAdmiteCorreosUnicesarEnCualquierEntorno(string entorno, string correo)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, entorno)
            .RegistroMicrosoft(NuevoRegistroMicrosoft(correo: correo), CancellationToken.None);

        Assert.Equal(StatusCodes.Status403Forbidden, Estado(result));
        Assert.False(await context.Usuarios.AnyAsync());
    }

    [Fact]
    public async Task RegistroMicrosoftRechazaUnaIdentidadYaRegistrada()
    {
        await using var context = NewContext();
        var controlador = ControladorRegistro(context, "Production");
        await controlador.RegistroMicrosoft(NuevoRegistroMicrosoft(), CancellationToken.None);

        var result = await controlador.RegistroMicrosoft(
            NuevoRegistroMicrosoft(correo: "otra@unicesar.edu.co", cedula: "1000"),
            CancellationToken.None);

        Assert.IsType<ConflictObjectResult>(result.Result);
        Assert.Equal(1, await context.Usuarios.CountAsync());
    }

    private static UsuariosRegistroGoogleDTO NuevoRegistroGoogle(
        string correo = "nueva@unicesar.edu.co",
        string sub = "sub-google-1",
        string cedula = "888",
        bool verificado = true,
        string contrasena = "ClaveGoogle1",
        string? telefono = "+57 310 555 0000") => new()
    {
        Sub = sub, Correo = correo, EmailVerificado = verificado, Cedula = cedula,
        PrimerNombre = " Nueva ", SegundoNombre = null, PrimerApellido = "Persona",
        SegundoApellido = null, Edad = 20, Ocupacion = "Estudiante", Contrasena = contrasena,
        Telefono = telefono
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
        var telefono = await context.TelefonosUsuario.SingleAsync();
        Assert.Equal((usuario.IdPersonas, "+573105550000"), (telefono.IdUsuario, telefono.Telefono));

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
    [InlineData(null)]
    [InlineData("")]
    [InlineData("6055712345")]
    public async Task RegistroGoogleExigeUnCelularColombianoValido(string? telefono)
    {
        await using var context = NewContext();

        var result = await ControladorRegistro(context, "Production")
            .RegistroGoogle(NuevoRegistroGoogle(telefono: telefono), CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.False(await context.Usuarios.AnyAsync());
        Assert.False(await context.IdentidadesExternas.AnyAsync());
        Assert.False(await context.TelefonosUsuario.AnyAsync());
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
        // Con herencia TPT, el automóvil es el propio vehículo (una sola entidad).
        context.Automoviles.Add(new Automovil
        {
            IdVehiculo = 5, Tipo = "Automovil", Modelo = "Mazda 2", Capacidad = 3, IdUsuario = 1, NumeroPuertas = 4
        });
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
        var vehiculo = await context.Automoviles.FirstAsync(v => v.IdVehiculo == 5);
        Assert.Equal("Kia Picanto", vehiculo.Modelo);
        Assert.Equal(2, vehiculo.Capacidad);
        Assert.Equal((short)5, vehiculo.NumeroPuertas);
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
