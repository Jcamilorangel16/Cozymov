using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public sealed class RecuperacionControllerTests
{
    private const string Correo = "ana@unicesar.edu.co";

    private sealed class RelojFalso(DateTimeOffset inicio) : TimeProvider
    {
        private DateTimeOffset _ahora = inicio;
        public override DateTimeOffset GetUtcNow() => _ahora;
        public void Avanzar(TimeSpan tiempo) => _ahora += tiempo;
    }

    private sealed class EnviadorFalso : IEnviadorCorreo
    {
        public List<(string Correo, string Codigo)> Recuperaciones { get; } = [];
        public bool Falla { get; set; }

        public Task EnviarCodigoAsync(string correo, string codigo, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task EnviarCodigoRecuperacionAsync(string correo, string codigo, CancellationToken cancellationToken = default)
        {
            if (Falla) throw new HttpRequestException("Brevo caído");
            Recuperaciones.Add((correo, codigo));
            return Task.CompletedTask;
        }
    }

    private sealed class Entorno
    {
        public required AppDbContext Context { get; init; }
        public required EnviadorFalso Enviador { get; init; }
        public required RelojFalso Reloj { get; init; }
        public required IPasswordHasher<Usuarios> Hasher { get; init; }
        public required IConfiguration Configuracion { get; init; }

        public RecuperacionController Controlador() => new(
            Context, Enviador, Hasher, Configuracion, Reloj,
            NullLogger<RecuperacionController>.Instance);
    }

    private static async Task<Entorno> CrearEntorno(bool conClave = true)
    {
        var context = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options);
        var hasher = new PasswordHasher<Usuarios>();
        var usuario = new Usuarios
        {
            IdPersonas = 1, Cedula = "1", PrimerNombre = "Ana", SegundoNombre = "",
            PrimerApellido = "P", SegundoApellido = "", Correo = Correo,
            rol = "ambos", ocupacion = "Estudiante"
        };
        usuario.Contrasena = hasher.HashPassword(usuario, "ClaveAntigua1");
        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync();

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(conClave
                ? new Dictionary<string, string?> { ["Jwt:Clave"] = "clave-de-prueba-no-real" }
                : [])
            .Build();
        return new Entorno
        {
            Context = context,
            Enviador = new EnviadorFalso(),
            Reloj = new RelojFalso(new DateTimeOffset(2026, 11, 16, 12, 0, 0, TimeSpan.Zero)),
            Hasher = hasher,
            Configuracion = config
        };
    }

    private static Task<IActionResult> Solicitar(Entorno e, string correo = Correo) =>
        e.Controlador().Solicitar(new SolicitarRecuperacionDTO { Correo = correo }, default);

    private static Task<IActionResult> Restablecer(
        Entorno e, string codigo, string contrasena = "ClaveNueva123", string correo = Correo) =>
        e.Controlador().Restablecer(
            new RestablecerContrasenaDTO { Correo = correo, Codigo = codigo, NuevaContrasena = contrasena },
            default);

    private static string CodigoIncorrecto(string real) => real == "000000" ? "000001" : "000000";

    [Fact]
    public async Task SolicitarEnviaCodigoYGuardaSoloElHash()
    {
        var e = await CrearEntorno();

        var resultado = await Solicitar(e, "  ANA@unicesar.edu.co ");

        Assert.IsType<OkObjectResult>(resultado);
        var (correoEnviado, codigo) = Assert.Single(e.Enviador.Recuperaciones);
        Assert.Equal(Correo, correoEnviado);
        Assert.Matches(@"^\d{6}$", codigo);
        var usuario = await e.Context.Usuarios.SingleAsync();
        Assert.NotNull(usuario.CodigoRecuperacionHash);
        Assert.DoesNotContain(codigo, usuario.CodigoRecuperacionHash);
        Assert.Equal(e.Reloj.GetUtcNow().UtcDateTime + RecuperacionController.Vigencia, usuario.CodigoRecuperacionVence);
    }

    [Fact]
    public async Task SolicitarConCorreoDesconocidoRespondeIgualYNoEnvia()
    {
        var e = await CrearEntorno();

        var desconocido = await Solicitar(e, "nadie@unicesar.edu.co");
        var conocido = await Solicitar(e);

        var a = Assert.IsType<OkObjectResult>(desconocido);
        var b = Assert.IsType<OkObjectResult>(conocido);
        Assert.Equal(a.Value!.ToString(), b.Value!.ToString());
        Assert.Single(e.Enviador.Recuperaciones);
    }

    [Fact]
    public async Task SolicitarRechazaCorreoMalFormado()
    {
        var e = await CrearEntorno();

        Assert.IsType<BadRequestObjectResult>(await Solicitar(e, "no-es-correo"));
        Assert.Empty(e.Enviador.Recuperaciones);
    }

    [Fact]
    public async Task SolicitarSinClaveConfiguradaDevuelve503()
    {
        var e = await CrearEntorno(conClave: false);

        var resultado = await Solicitar(e);

        Assert.Equal(503, Assert.IsType<ObjectResult>(resultado).StatusCode);
    }

    [Fact]
    public async Task SolicitarRespetaLaEsperaEntreEnviosYLuegoPermiteReenviar()
    {
        var e = await CrearEntorno();

        await Solicitar(e);
        await Solicitar(e);
        Assert.Single(e.Enviador.Recuperaciones);

        e.Reloj.Avanzar(RecuperacionController.EsperaEntreEnvios + TimeSpan.FromSeconds(1));
        await Solicitar(e);
        Assert.Equal(2, e.Enviador.Recuperaciones.Count);
    }

    [Fact]
    public async Task SolicitarNoRevelaFalloDeEnvio()
    {
        var e = await CrearEntorno();
        e.Enviador.Falla = true;

        Assert.IsType<OkObjectResult>(await Solicitar(e));
    }

    [Fact]
    public async Task RestablecerConCodigoCorrectoCambiaLaContrasenaYEsDeUnSoloUso()
    {
        var e = await CrearEntorno();
        await Solicitar(e);
        var codigo = e.Enviador.Recuperaciones[0].Codigo;

        Assert.IsType<OkObjectResult>(await Restablecer(e, codigo));

        var usuario = await e.Context.Usuarios.SingleAsync();
        Assert.Equal(
            PasswordVerificationResult.Success,
            e.Hasher.VerifyHashedPassword(usuario, usuario.Contrasena, "ClaveNueva123"));
        Assert.Null(usuario.CodigoRecuperacionHash);
        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, codigo, "OtraClave12345"));
    }

    [Fact]
    public async Task RestablecerConCodigoIncorrectoNoCambiaLaContrasena()
    {
        var e = await CrearEntorno();
        await Solicitar(e);
        var real = e.Enviador.Recuperaciones[0].Codigo;

        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, CodigoIncorrecto(real)));

        var usuario = await e.Context.Usuarios.SingleAsync();
        Assert.Equal(
            PasswordVerificationResult.Success,
            e.Hasher.VerifyHashedPassword(usuario, usuario.Contrasena, "ClaveAntigua1"));
        Assert.Equal(1, usuario.CodigoRecuperacionIntentos);
    }

    [Fact]
    public async Task RestablecerInvalidaElCodigoTrasElMaximoDeIntentos()
    {
        var e = await CrearEntorno();
        await Solicitar(e);
        var real = e.Enviador.Recuperaciones[0].Codigo;

        for (var i = 0; i < RecuperacionController.MaximoIntentos; i++)
        {
            await Restablecer(e, CodigoIncorrecto(real));
        }

        // Ni siquiera el código correcto sirve ya.
        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, real));
        var usuario = await e.Context.Usuarios.SingleAsync();
        Assert.Null(usuario.CodigoRecuperacionHash);
    }

    [Fact]
    public async Task RestablecerRechazaCodigoVencido()
    {
        var e = await CrearEntorno();
        await Solicitar(e);
        var codigo = e.Enviador.Recuperaciones[0].Codigo;

        e.Reloj.Avanzar(RecuperacionController.Vigencia + TimeSpan.FromSeconds(1));

        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, codigo));
    }

    [Fact]
    public async Task RestablecerRechazaContrasenaDebilYCorreoSinSolicitud()
    {
        var e = await CrearEntorno();
        await Solicitar(e);
        var codigo = e.Enviador.Recuperaciones[0].Codigo;

        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, codigo, "corta"));
        Assert.IsType<BadRequestObjectResult>(await Restablecer(e, codigo, new string('a', 73)));
        Assert.IsType<BadRequestObjectResult>(
            await Restablecer(e, codigo, correo: "nadie@unicesar.edu.co"));
        // Una contraseña rechazada no consume el código.
        Assert.IsType<OkObjectResult>(await Restablecer(e, codigo));
    }
}
