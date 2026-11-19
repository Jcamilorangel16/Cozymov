using Backend.Services;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MimeKit;

namespace Backend.Tests;

public sealed class SmtpEnviadorCorreoTests
{
    // Valores ficticios solo para las pruebas; no son credenciales reales.
    private const string RemitenteConfirmado = "jdvasquezaltamiranda@unicesar.edu.co";

    private static Dictionary<string, string?> ConfiguracionBase() => new()
    {
        ["Correo:Smtp:Host"] = "smtp.pruebas.local",
        ["Correo:Smtp:Puerto"] = "587",
        ["Correo:Smtp:Usuario"] = "usuario-pruebas",
        ["Correo:Smtp:Password"] = "clave-ficticia-de-pruebas",
        ["Correo:Smtp:Seguridad"] = "StartTls",
        ["Correo:Remitente"] = RemitenteConfirmado,
    };

    private static IConfiguration Configuracion(Dictionary<string, string?> valores) =>
        new ConfigurationBuilder().AddInMemoryCollection(valores).Build();

    private sealed class TransporteFalso : ITransporteSmtp
    {
        public List<(OpcionesSmtp Opciones, MimeMessage Mensaje)> Enviados { get; } = [];
        public Exception? Falla { get; set; }

        public Task EnviarAsync(OpcionesSmtp opciones, MimeMessage mensaje, CancellationToken cancellationToken)
        {
            if (Falla is not null) throw Falla;
            Enviados.Add((opciones, mensaje));
            return Task.CompletedTask;
        }
    }

    private sealed class Entorno(string nombre) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = nombre;
        public string ApplicationName { get; set; } = "Backend.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class RegistroDeLogs : ILogger<SmtpEnviadorCorreo>
    {
        public List<string> Mensajes { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception,
            Func<TState, Exception?, string> formatter) => Mensajes.Add(formatter(state, exception));
    }

    private static SmtpEnviadorCorreo Crear(
        TransporteFalso transporte,
        Dictionary<string, string?> valores,
        string entorno = "Production",
        ILogger<SmtpEnviadorCorreo>? logger = null) =>
        new(transporte, Configuracion(valores), new Entorno(entorno),
            logger ?? NullLogger<SmtpEnviadorCorreo>.Instance);

    [Fact]
    public async Task EnviaElCodigoConVigenciaDesdeElRemitenteConfigurado()
    {
        var transporte = new TransporteFalso();
        var enviador = Crear(transporte, ConfiguracionBase());

        await enviador.EnviarCodigoAsync("ana@unicesar.edu.co", "012345");

        var (opciones, mensaje) = Assert.Single(transporte.Enviados);
        Assert.Equal("smtp.pruebas.local", opciones.Host);
        Assert.Equal(587, opciones.Puerto);
        Assert.Equal(SecureSocketOptions.StartTls, opciones.OpcionesSocket);
        Assert.Equal(RemitenteConfirmado, ((MailboxAddress)mensaje.From.Single()).Address);
        Assert.Equal("ana@unicesar.edu.co", ((MailboxAddress)mensaje.To.Single()).Address);
        Assert.Contains("012345", mensaje.HtmlBody);
        Assert.Contains("012345", mensaje.TextBody);
        Assert.Contains("10 minutos", mensaje.HtmlBody);
        Assert.Contains("10 minutos", mensaje.TextBody);
        Assert.Contains("pantalla de registro", mensaje.TextBody);
    }

    [Fact]
    public async Task ElCorreoDeRecuperacionUsaSuPropiaPlantilla()
    {
        var transporte = new TransporteFalso();
        var enviador = Crear(transporte, ConfiguracionBase());

        await enviador.EnviarCodigoRecuperacionAsync("ana@unicesar.edu.co", "654321");

        var (_, mensaje) = Assert.Single(transporte.Enviados);
        Assert.Contains("contraseña", mensaje.Subject);
        Assert.Contains("654321", mensaje.TextBody);
    }

    [Theory]
    [InlineData("Ssl", 465, SecureSocketOptions.SslOnConnect)]
    [InlineData("StartTls", 587, SecureSocketOptions.StartTls)]
    public async Task ElPuertoPorDefectoYElCifradoDependenDelModoDeSeguridad(
        string seguridad, int puertoEsperado, SecureSocketOptions esperado)
    {
        var valores = ConfiguracionBase();
        valores["Correo:Smtp:Seguridad"] = seguridad;
        valores.Remove("Correo:Smtp:Puerto");
        var transporte = new TransporteFalso();

        await Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "111111");

        var (opciones, _) = Assert.Single(transporte.Enviados);
        Assert.Equal(puertoEsperado, opciones.Puerto);
        Assert.Equal(esperado, opciones.OpcionesSocket);
    }

    [Fact]
    public async Task SinHostFueraDeDevelopmentFallaComoNoConfigurado()
    {
        var valores = ConfiguracionBase();
        valores.Remove("Correo:Smtp:Host");
        var transporte = new TransporteFalso();

        await Assert.ThrowsAsync<CorreoNoConfiguradoException>(() =>
            Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));
        Assert.Empty(transporte.Enviados);
    }

    [Fact]
    public async Task EnDevelopmentSinSmtpSoloRegistraElCodigoEnElLog()
    {
        var transporte = new TransporteFalso();
        var logs = new RegistroDeLogs();

        await Crear(transporte, new Dictionary<string, string?>(), "Development", logs)
            .EnviarCodigoAsync("ana@unicesar.edu.co", "123456");

        Assert.Empty(transporte.Enviados);
        Assert.Contains(logs.Mensajes, m => m.Contains("123456"));
    }

    [Theory]
    [InlineData("jdvasquezaltamiranda@unicesar..edu.co")]
    [InlineData("sin-arroba")]
    [InlineData("")]
    public async Task UnRemitenteInvalidoNoSeCorrigeNiSeUsa(string remitente)
    {
        var valores = ConfiguracionBase();
        valores["Correo:Remitente"] = remitente;
        var transporte = new TransporteFalso();

        await Assert.ThrowsAsync<CorreoNoConfiguradoException>(() =>
            Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));
        Assert.Empty(transporte.Enviados);
    }

    [Theory]
    [InlineData("Correo:Smtp:Puerto", "no-es-numero")]
    [InlineData("Correo:Smtp:Puerto", "70000")]
    [InlineData("Correo:Smtp:Seguridad", "Quizas")]
    public async Task UnaConfiguracionInvalidaSeRechazaSinEnviar(string clave, string valor)
    {
        var valores = ConfiguracionBase();
        valores[clave] = valor;
        var transporte = new TransporteFalso();

        await Assert.ThrowsAsync<CorreoNoConfiguradoException>(() =>
            Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));
        Assert.Empty(transporte.Enviados);
    }

    [Fact]
    public async Task UsuarioSinContrasenaSeRechaza()
    {
        var valores = ConfiguracionBase();
        valores.Remove("Correo:Smtp:Password");
        var transporte = new TransporteFalso();

        await Assert.ThrowsAsync<CorreoNoConfiguradoException>(() =>
            Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));
    }

    [Fact]
    public async Task SinCifradoSoloSePermiteEnDevelopment()
    {
        var valores = ConfiguracionBase();
        valores["Correo:Smtp:Seguridad"] = "Ninguna";

        await Assert.ThrowsAsync<CorreoNoConfiguradoException>(() =>
            Crear(new TransporteFalso(), valores).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));

        var transporte = new TransporteFalso();
        await Crear(transporte, valores, "Development").EnviarCodigoAsync("ana@unicesar.edu.co", "123456");
        Assert.Single(transporte.Enviados);
    }

    [Fact]
    public async Task UnFalloDelServidorSePropagaParaQueElControladorResponda()
    {
        var transporte = new TransporteFalso { Falla = new IOException("conexión rechazada") };

        await Assert.ThrowsAsync<IOException>(() =>
            Crear(transporte, ConfiguracionBase()).EnviarCodigoAsync("ana@unicesar.edu.co", "123456"));
    }

    [Fact]
    public async Task NingunLogContieneLaContrasenaNiElCodigoFueraDeDevelopment()
    {
        var transporte = new TransporteFalso();
        var logs = new RegistroDeLogs();

        await Crear(transporte, ConfiguracionBase(), "Production", logs)
            .EnviarCodigoAsync("ana@unicesar.edu.co", "987654");

        Assert.NotEmpty(logs.Mensajes);
        Assert.DoesNotContain(logs.Mensajes, m => m.Contains("clave-ficticia-de-pruebas"));
        Assert.DoesNotContain(logs.Mensajes, m => m.Contains("987654"));
    }

    [Fact]
    public async Task AceptaLosNombresAlternativosSmtpDosPuntos()
    {
        var valores = new Dictionary<string, string?>
        {
            ["Smtp:Host"] = "smtp.pruebas.local",
            ["Smtp:Port"] = "587",
            ["Smtp:User"] = "usuario-pruebas",
            ["Smtp:Password"] = "clave-ficticia-de-pruebas",
            ["Smtp:From"] = RemitenteConfirmado,
            ["Smtp:FromName"] = "Cozymov Pruebas",
        };
        var transporte = new TransporteFalso();

        await Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "222222");

        var (opciones, mensaje) = Assert.Single(transporte.Enviados);
        Assert.Equal("smtp.pruebas.local", opciones.Host);
        Assert.Equal(SecureSocketOptions.StartTls, opciones.OpcionesSocket);
        Assert.Equal("Cozymov Pruebas", ((MailboxAddress)mensaje.From.Single()).Name);
        Assert.True(ProveedorCorreo.UsaSmtp(Configuracion(valores)));
    }

    [Fact]
    public async Task ElPuerto465SinModoExplicitoUsaTlsImplicito()
    {
        var valores = ConfiguracionBase();
        valores.Remove("Correo:Smtp:Seguridad");
        valores["Correo:Smtp:Puerto"] = "465";
        var transporte = new TransporteFalso();

        await Crear(transporte, valores).EnviarCodigoAsync("ana@unicesar.edu.co", "333333");

        Assert.Equal(SecureSocketOptions.SslOnConnect, Assert.Single(transporte.Enviados).Opciones.OpcionesSocket);
    }

    [Theory]
    [InlineData("smtp", "", true)]
    [InlineData("SMTP", "", true)]
    [InlineData("brevo", "smtp.pruebas.local", false)]
    [InlineData("", "smtp.pruebas.local", true)]
    [InlineData("", "", false)]
    public void ElProveedorSeElige_PorConfiguracion(string proveedor, string host, bool esperaSmtp)
    {
        var configuracion = Configuracion(new Dictionary<string, string?>
        {
            ["Correo:Proveedor"] = proveedor,
            ["Correo:Smtp:Host"] = host,
        });

        Assert.Equal(esperaSmtp, ProveedorCorreo.UsaSmtp(configuracion));
    }
}
