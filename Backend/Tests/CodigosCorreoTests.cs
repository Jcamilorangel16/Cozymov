using System.Text.RegularExpressions;
using Backend.Controllers;
using Backend.Data;
using Backend.DTOs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting.Internal;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public sealed class CodigosCorreoTests
{
    private sealed class RelojManual : TimeProvider
    {
        public DateTimeOffset Ahora { get; set; } = new(2026, 11, 20, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Ahora;
        public void Avanzar(TimeSpan tiempo) => Ahora = Ahora.Add(tiempo);
    }

    private sealed class EnviadorFalso : IEnviadorCorreo
    {
        public bool Configurado { get; set; } = true;
        public bool Fallar { get; set; }
        public List<(string Destino, string Asunto, string Texto)> Enviados { get; } = [];

        public Task EnviarAsync(string destino, string asunto, string texto, string html, CancellationToken cancellationToken)
        {
            if (Fallar) throw new InvalidOperationException("5.7.139 Authentication unsuccessful");
            Enviados.Add((destino, asunto, texto));
            return Task.CompletedTask;
        }

        public string UltimoCodigo => Regex.Match(Enviados[^1].Texto, @"\b\d{6}\b").Value;
    }

    private sealed record Entorno(
        AppDbContext Context,
        CodigosCorreoController Controlador,
        EnviadorFalso Enviador,
        RelojManual Reloj,
        LimitadorIntentos Limitador,
        PasswordHasher<Usuarios> Hasher);

    private static async Task<Entorno> CrearEntorno(string entorno = "Production")
    {
        var context = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var hasher = new PasswordHasher<Usuarios>();
        var usuario = new Usuarios
        {
            IdPersonas = 1, Cedula = "1", PrimerNombre = "Ana", SegundoNombre = "",
            PrimerApellido = "Díaz", SegundoApellido = "", Correo = "Ana@Unicesar.edu.co",
            rol = "usuario", ocupacion = "Estudiante"
        };
        usuario.Contrasena = hasher.HashPassword(usuario, "ClaveVieja1");
        context.Usuarios.Add(usuario);
        await context.SaveChangesAsync();

        var reloj = new RelojManual();
        var enviador = new EnviadorFalso();
        var limitador = new LimitadorIntentos(reloj);
        var controlador = new CodigosCorreoController(
            context, new CodigosVerificacion(reloj), enviador, hasher, limitador,
            new HostingEnvironment { EnvironmentName = entorno },
            NullLogger<CodigosCorreoController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        return new Entorno(context, controlador, enviador, reloj, limitador, hasher);
    }

    private static int? Estado(IActionResult resultado) => (resultado as IStatusCodeActionResult)?.StatusCode;

    private static Task<IActionResult> Enviar(Entorno e, string correo, string proposito) =>
        e.Controlador.Enviar(new EnviarCodigoDTO { Correo = correo, Proposito = proposito }, CancellationToken.None);

    [Fact]
    public async Task RegistroEnviaUnCodigoQueSoloSirveUnaVez()
    {
        var e = await CrearEntorno();

        Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(e, " Nuevo@Unicesar.edu.co ", "registro")));
        var (destino, _, _) = Assert.Single(e.Enviador.Enviados);
        Assert.Equal("nuevo@unicesar.edu.co", destino);
        var codigo = e.Enviador.UltimoCodigo;
        Assert.Matches(@"^\d{6}$", codigo);

        var otro = codigo == "000000" ? "000001" : "000000";
        Assert.IsType<BadRequestObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "nuevo@unicesar.edu.co", Codigo = otro }));
        Assert.IsType<OkObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "NUEVO@unicesar.edu.co", Codigo = $" {codigo} " }));
        Assert.IsType<BadRequestObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "nuevo@unicesar.edu.co", Codigo = codigo }));
    }

    [Fact]
    public async Task RegistroRechazaCorreoYaRegistradoONoInstitucional()
    {
        var e = await CrearEntorno();

        Assert.Equal(StatusCodes.Status409Conflict, Estado(await Enviar(e, "ana@unicesar.edu.co", "registro")));
        Assert.Equal(StatusCodes.Status400BadRequest, Estado(await Enviar(e, "ana@gmail.com", "registro")));
        Assert.Equal(StatusCodes.Status400BadRequest, Estado(await Enviar(e, "no-es-correo", "registro")));
        Assert.Equal(StatusCodes.Status400BadRequest, Estado(await Enviar(e, "a@unicesar.edu.co", "otro")));
        Assert.Empty(e.Enviador.Enviados);

        var desarrollo = await CrearEntorno("Development");
        Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(desarrollo, "ana@gmail.com", "registro")));
    }

    [Fact]
    public async Task RecuperacionNoRevelaSiLaCuentaExiste()
    {
        var e = await CrearEntorno();

        var sinCuenta = await Enviar(e, "nadie@unicesar.edu.co", "recuperacion");
        var conCuenta = await Enviar(e, "ana@unicesar.edu.co", "recuperacion");

        Assert.Equal(StatusCodes.Status202Accepted, Estado(sinCuenta));
        Assert.Equal(StatusCodes.Status202Accepted, Estado(conCuenta));
        Assert.Equal(
            Assert.IsType<AcceptedResult>(sinCuenta).Value?.ToString(),
            Assert.IsType<AcceptedResult>(conCuenta).Value?.ToString());
        Assert.Equal("ana@unicesar.edu.co", Assert.Single(e.Enviador.Enviados).Destino);
    }

    [Fact]
    public async Task RestablecerCambiaLaContrasenaYDesbloqueaElLogin()
    {
        var e = await CrearEntorno();
        for (var i = 0; i < LimitadorIntentos.MaximoIntentos; i++) e.Limitador.RegistrarFallo("login|ana@unicesar.edu.co");
        await Enviar(e, "ana@unicesar.edu.co", "recuperacion");
        var codigo = e.Enviador.UltimoCodigo;

        // Una contraseña inválida no gasta el código.
        var corta = await e.Controlador.RestablecerContrasena(new RestablecerContrasenaDTO
        {
            Correo = "ana@unicesar.edu.co", Codigo = codigo, NuevaContrasena = "corta"
        }, CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(corta);

        var resultado = await e.Controlador.RestablecerContrasena(new RestablecerContrasenaDTO
        {
            Correo = "Ana@unicesar.edu.co", Codigo = codigo, NuevaContrasena = "ClaveNueva2"
        }, CancellationToken.None);

        Assert.IsType<NoContentResult>(resultado);
        var usuario = await e.Context.Usuarios.SingleAsync();
        Assert.Equal(PasswordVerificationResult.Success,
            e.Hasher.VerifyHashedPassword(usuario, usuario.Contrasena, "ClaveNueva2"));
        Assert.False(e.Limitador.EstaBloqueado("login|ana@unicesar.edu.co"));

        var otraVez = await e.Controlador.RestablecerContrasena(new RestablecerContrasenaDTO
        {
            Correo = "ana@unicesar.edu.co", Codigo = codigo, NuevaContrasena = "OtraClave3"
        }, CancellationToken.None);
        Assert.IsType<BadRequestObjectResult>(otraVez);
    }

    [Fact]
    public async Task ElCodigoDeRegistroNoSirveParaRestablecer()
    {
        var e = await CrearEntorno("Development");
        await Enviar(e, "nueva@unicesar.edu.co", "registro");

        var resultado = await e.Controlador.RestablecerContrasena(new RestablecerContrasenaDTO
        {
            Correo = "nueva@unicesar.edu.co", Codigo = e.Enviador.UltimoCodigo, NuevaContrasena = "ClaveNueva2"
        }, CancellationToken.None);

        Assert.IsType<BadRequestObjectResult>(resultado);
    }

    [Fact]
    public async Task ExigeEsperarAntesDeReenviarYReemplazaElCodigoAnterior()
    {
        var e = await CrearEntorno();
        await Enviar(e, "nueva@unicesar.edu.co", "registro");
        var primero = e.Enviador.UltimoCodigo;

        Assert.Equal(StatusCodes.Status429TooManyRequests, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
        Assert.Single(e.Enviador.Enviados);

        e.Reloj.Avanzar(CodigosVerificacion.EsperaReenvio);
        Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
        var segundo = e.Enviador.UltimoCodigo;
        if (primero != segundo)
        {
            Assert.IsType<BadRequestObjectResult>(e.Controlador.Verificar(
                new VerificarCodigoDTO { Correo = "nueva@unicesar.edu.co", Codigo = primero }));
        }
        Assert.IsType<OkObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "nueva@unicesar.edu.co", Codigo = segundo }));
    }

    [Fact]
    public async Task LimitaLosEnviosPorHora()
    {
        var e = await CrearEntorno();
        for (var i = 0; i < CodigosVerificacion.MaximoEnviosPorHora; i++)
        {
            Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
            e.Reloj.Avanzar(CodigosVerificacion.EsperaReenvio);
        }

        Assert.Equal(StatusCodes.Status429TooManyRequests, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
        e.Reloj.Avanzar(TimeSpan.FromHours(1));
        Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
    }

    [Fact]
    public async Task CincoIntentosFallidosInvalidanElCodigo()
    {
        var e = await CrearEntorno();
        await Enviar(e, "nueva@unicesar.edu.co", "registro");
        var codigo = e.Enviador.UltimoCodigo;
        var incorrecto = codigo == "123456" ? "654321" : "123456";

        for (var i = 0; i < CodigosVerificacion.MaximoIntentos; i++)
        {
            e.Controlador.Verificar(new VerificarCodigoDTO { Correo = "nueva@unicesar.edu.co", Codigo = incorrecto });
        }

        Assert.IsType<BadRequestObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "nueva@unicesar.edu.co", Codigo = codigo }));
    }

    [Fact]
    public async Task ElCodigoVenceALosDiezMinutos()
    {
        var e = await CrearEntorno();
        await Enviar(e, "nueva@unicesar.edu.co", "registro");
        var codigo = e.Enviador.UltimoCodigo;

        e.Reloj.Avanzar(CodigosVerificacion.Vigencia);

        Assert.IsType<BadRequestObjectResult>(e.Controlador.Verificar(
            new VerificarCodigoDTO { Correo = "nueva@unicesar.edu.co", Codigo = codigo }));
    }

    [Fact]
    public async Task SiSmtpFallaRespondeServicioNoDisponibleYPermiteReintentar()
    {
        var e = await CrearEntorno();
        e.Enviador.Fallar = true;

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));

        e.Enviador.Fallar = false;
        Assert.Equal(StatusCodes.Status202Accepted, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
    }

    [Fact]
    public async Task SinConfiguracionSmtpRespondeServicioNoDisponible()
    {
        var e = await CrearEntorno();
        e.Enviador.Configurado = false;

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Estado(await Enviar(e, "nueva@unicesar.edu.co", "registro")));
        Assert.Empty(e.Enviador.Enviados);
    }

    [Fact]
    public void OpcionesSmtpIncompletasNoSeConsideranConfiguradas()
    {
        Assert.False(new OpcionesSmtp().Completa);
        Assert.Equal(("smtp.office365.com", 587), (new OpcionesSmtp().Servidor, new OpcionesSmtp().Puerto));
        Assert.False(new OpcionesSmtp { Servidor = "smtp.office365.com", Usuario = "a@b.co" }.Completa);
        Assert.True(new OpcionesSmtp
        {
            Servidor = "smtp.office365.com", Usuario = "a@b.co", Contrasena = "x"
        }.Completa);
    }
}
